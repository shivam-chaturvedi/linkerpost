import hashlib
import logging
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.core.token_encryption import TokenCipher
from app.models.account import Account
from app.models.oauth_state import OAuthState
from app.repositories.users import get_user_by_id
from app.schemas.linkedin import (
    AccountsResponse,
    DeleteAccountResponse,
    LinkedInConnectRequest,
    LinkedInConnectResponse,
)
from app.services.linkedin import LinkedInClient, LinkedInServiceError

router = APIRouter(tags=["linkedin"])
PROVIDER = "linkedin"
logger = logging.getLogger(__name__)


def _state_hash(state: str) -> str:
    return hashlib.sha256(state.encode()).hexdigest()


def _redirect(return_to: str, outcome: str, error: str | None = None) -> RedirectResponse:
    settings = get_settings()
    query: dict[str, str] = {"linkedin": outcome}
    if error:
        query["error"] = error
    return RedirectResponse(
        f"{settings.FRONTEND_APP_URL}{return_to}?{urlencode(query)}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post("/linkedin/connect", response_model=LinkedInConnectResponse)
async def connect_linkedin(
    payload: LinkedInConnectRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> LinkedInConnectResponse:
    settings = get_settings()
    if not settings.linkedin_is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LinkedIn connection is not configured",
        )

    now = datetime.now(UTC)
    await session.execute(
        delete(OAuthState).where(
            OAuthState.user_id == current_user.id,
            OAuthState.provider == PROVIDER,
            OAuthState.expires_at <= now,
        )
    )
    raw_state = secrets.token_urlsafe(48)
    session.add(
        OAuthState(
            user_id=current_user.id,
            provider=PROVIDER,
            state_hash=_state_hash(raw_state),
            return_to=payload.return_to,
            expires_at=now + timedelta(minutes=settings.LINKEDIN_OAUTH_STATE_TTL_MINUTES),
        )
    )
    await session.commit()
    return LinkedInConnectResponse(
        authorization_url=LinkedInClient(settings).authorization_url(raw_state)
    )


@router.get("/linkedin/callback", response_model=None)
async def linkedin_callback(
    session: DatabaseSession,
    state: str = Query(min_length=32, max_length=512),
    code: str | None = Query(default=None, min_length=1, max_length=4096),
    error: str | None = Query(default=None, max_length=128),
    error_description: str | None = Query(default=None, max_length=512),
) -> RedirectResponse:
    """Complete LinkedIn OAuth without requiring the session cookie.

    LinkedIn redirects the browser to the API host as a first-party navigation.
    Cross-site (Partitioned) auth cookies set under the frontend origin are not
    sent, so the owning user is taken from the one-time ``OAuthState`` row.
    """
    settings = get_settings()
    now = datetime.now(UTC)
    _ = error_description  # LinkedIn may send this; we map via ``error`` only.

    if error:
        return_to = "/app/accounts"
        try:
            result = await session.execute(
                select(OAuthState).where(
                    OAuthState.provider == PROVIDER, OAuthState.state_hash == _state_hash(state)
                )
            )
            oauth_state = result.scalar_one_or_none()
            if oauth_state is not None:
                return_to = oauth_state.return_to
                oauth_state.used_at = now
                await session.commit()
        except Exception:
            pass
        return _redirect(return_to, "error", error)

    result = await session.execute(
        select(OAuthState)
        .where(OAuthState.provider == PROVIDER, OAuthState.state_hash == _state_hash(state))
        .with_for_update()
    )
    oauth_state = result.scalar_one_or_none()
    if (
        oauth_state is None
        or oauth_state.user_id is None
        or oauth_state.used_at is not None
        or oauth_state.expires_at <= now
    ):
        return _redirect("/app/accounts", "error", "user_cancelled_login")

    user = await get_user_by_id(session, oauth_state.user_id)
    if user is None or not user.is_active:
        return _redirect("/app/accounts", "error", "user_cancelled_login")

    return_to = oauth_state.return_to
    oauth_state.used_at = now
    await session.commit()

    if not code:
        return _redirect(return_to, "error", "authorization_denied")

    try:
        linkedin = LinkedInClient(settings)
        token = await linkedin.exchange_code(code)
        profile = await linkedin.get_userinfo(token.access_token)
        cipher = TokenCipher(settings.linkedin_token_encryption_keys)
    except LinkedInServiceError as exc:
        logger.warning(
            "LinkedIn OAuth failed stage=%s upstream_status=%s provider_error=%s user_id=%s",
            exc.stage,
            exc.upstream_status,
            exc.provider_error,
            user.id,
        )
        return _redirect(return_to, "error", exc.public_code)
    except ValueError:
        logger.exception("LinkedIn token encryption setup failed user_id=%s", user.id)
        return _redirect(return_to, "error", "token_encryption_failed")

    PUBLISHING_SCOPES = {
        "w_member_social",
        "w_member_social_feed",
        "w_organization_social",
    }
    OIDC_SCOPES = {
        "openid",
        "profile",
        "email",
        "r_liteprofile",
        "r_emailaddress",
    }
    granted_scopes = [
        scope
        for scope in re.split(r"[\s,]+", token.scope or "")
        if scope
    ]
    if not granted_scopes:
        # LinkedIn often omits `scope` on the token response even when granted.
        granted_scopes = list(settings.linkedin_scopes)
    elif not PUBLISHING_SCOPES.intersection(granted_scopes) and PUBLISHING_SCOPES.intersection(
        settings.linkedin_scopes
    ):
        # Token responses frequently list only OIDC scopes while publishing was still granted.
        if set(granted_scopes).issubset(OIDC_SCOPES):
            granted_scopes = list(dict.fromkeys([*granted_scopes, *settings.linkedin_scopes]))
    expires_at = now + timedelta(seconds=token.expires_in)
    refresh_expires_at = (
        now + timedelta(seconds=token.refresh_token_expires_in)
        if token.refresh_token_expires_in is not None
        else None
    )
    display_name = profile.name or " ".join(
        part for part in (profile.given_name, profile.family_name) if part
    )
    display_name = display_name or "LinkedIn member"

    account_result = await session.execute(
        select(Account).where(
            Account.user_id == user.id,
            Account.provider == PROVIDER,
            Account.provider_account_id == profile.sub,
        )
    )
    account = account_result.scalar_one_or_none()
    values = {
        "display_name": display_name,
        "given_name": profile.given_name,
        "family_name": profile.family_name,
        "email": str(profile.email) if profile.email else None,
        "email_verified": profile.email_verified,
        "profile_image_url": profile.picture,
        "locale": profile.locale,
        "access_token_encrypted": cipher.encrypt(token.access_token),
        "refresh_token_encrypted": (
            cipher.encrypt(token.refresh_token) if token.refresh_token else None
        ),
        "token_expires_at": expires_at,
        "refresh_token_expires_at": refresh_expires_at,
        "scopes": granted_scopes,
        "status": "active",
        "last_synced_at": now,
    }
    if account is None:
        account = Account(
            user_id=user.id,
            provider=PROVIDER,
            provider_account_id=profile.sub,
            account_type="member",
            **values,
        )
        session.add(account)
    else:
        for field, value in values.items():
            setattr(account, field, value)
    await session.commit()
    has_publishing_permission = bool(PUBLISHING_SCOPES.intersection(granted_scopes))
    if not has_publishing_permission:
        return _redirect(return_to, "connected_warning", "permission_missing")
    return _redirect(return_to, "connected")


@router.get("/accounts", response_model=AccountsResponse)
async def list_accounts(current_user: CurrentUser, session: DatabaseSession) -> AccountsResponse:
    result = await session.execute(
        select(Account)
        .where(Account.user_id == current_user.id)
        .order_by(Account.created_at.desc())
    )
    accounts = list(result.scalars().all())
    return AccountsResponse(accounts=accounts)


@router.delete("/accounts/{account_id}", response_model=DeleteAccountResponse)
async def disconnect_account(
    account_id: UUID,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> DeleteAccountResponse:
    result = await session.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    await session.delete(account)
    await session.commit()
    return DeleteAccountResponse(message="LinkedIn account disconnected")
