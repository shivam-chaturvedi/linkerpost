import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import Settings, get_settings
from app.core.cookies import delete_session_cookie, set_session_cookie
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.oauth_state import OAuthState
from app.models.user import User
from app.repositories.users import get_user_by_email, get_user_by_google_id, normalize_email
from app.schemas.auth import (
    AuthResponse,
    CsrfResponse,
    GoogleSessionExchangeRequest,
    LoginRequest,
    MessageResponse,
    SignupRequest,
)
from app.services.google_oauth import GoogleClient, GoogleServiceError

router = APIRouter(prefix="/auth", tags=["authentication"])
GOOGLE_PROVIDER = "google"
GOOGLE_SESSION_PROVIDER = "google_session"
logger = logging.getLogger(__name__)


def set_auth_cookie(response: Response, user: User, settings: Settings) -> None:
    token = create_access_token(
        user_id=user.id,
        token_version=user.token_version,
        settings=settings,
    )
    set_session_cookie(
        response, key=settings.AUTH_COOKIE_NAME, value=token, settings=settings
    )


def delete_auth_cookies(response: Response, settings: Settings) -> None:
    for cookie_name in (settings.AUTH_COOKIE_NAME, settings.CSRF_COOKIE_NAME):
        delete_session_cookie(response, key=cookie_name, settings=settings)


def _state_hash(state: str) -> str:
    return hashlib.sha256(state.encode()).hexdigest()


def _google_redirect(*, outcome: str, error: str | None = None) -> RedirectResponse:
    settings = get_settings()
    query: dict[str, str] = {"google": outcome}
    if error:
        query["error"] = error
    return RedirectResponse(
        f"{settings.FRONTEND_APP_URL}/login?{urlencode(query)}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


def _split_display_name(name: str | None) -> tuple[str, str]:
    parts = [part for part in (name or "").strip().split() if part]
    if not parts:
        return ("Google", "User")
    if len(parts) == 1:
        return (parts[0][:80], "User")
    return (parts[0][:80], " ".join(parts[1:])[:80])


@router.get("/csrf", response_model=CsrfResponse)
async def csrf_token(response: Response) -> CsrfResponse:
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    # Double-submit: cookie (HttpOnly) + matching token in JSON / X-CSRF-Token header.
    # Cross-site FE (linkerpost.vercel.app) → API needs SameSite=None; Secure; Partitioned.
    set_session_cookie(
        response, key=settings.CSRF_COOKIE_NAME, value=token, settings=settings
    )
    response.headers["Cache-Control"] = "no-store"
    return CsrfResponse(csrf_token=token)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest, response: Response, session: DatabaseSession
) -> AuthResponse:
    settings = get_settings()
    email = normalize_email(str(payload.email))
    if await get_user_by_email(session, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        )

    user = User(
        email=email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
        ) from exc
    await session.refresh(user)
    set_auth_cookie(response, user, settings)
    response.headers["Cache-Control"] = "no-store"
    return AuthResponse(user=user)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest, response: Response, session: DatabaseSession
) -> AuthResponse:
    settings = get_settings()
    user = await get_user_by_email(session, str(payload.email))
    password_digest = (
        user.password_hash if user is not None and user.password_hash else DUMMY_PASSWORD_HASH
    )
    password_is_valid = verify_password(payload.password, password_digest)
    if (
        user is None
        or user.password_hash is None
        or not password_is_valid
        or not user.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    set_auth_cookie(response, user, settings)
    response.headers["Cache-Control"] = "no-store"
    return AuthResponse(user=user)


@router.get("/google", response_model=None)
async def google_login_start(session: DatabaseSession) -> RedirectResponse:
    settings = get_settings()
    if not settings.google_is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured",
        )

    now = datetime.now(UTC)
    await session.execute(
        delete(OAuthState).where(
            OAuthState.provider == GOOGLE_PROVIDER,
            OAuthState.user_id.is_(None),
            OAuthState.expires_at <= now,
        )
    )
    raw_state = secrets.token_urlsafe(48)
    session.add(
        OAuthState(
            user_id=None,
            provider=GOOGLE_PROVIDER,
            state_hash=_state_hash(raw_state),
            return_to="/app/dashboard",
            expires_at=now + timedelta(minutes=settings.GOOGLE_OAUTH_STATE_TTL_MINUTES),
        )
    )
    await session.commit()
    return RedirectResponse(
        GoogleClient(settings).authorization_url(raw_state),
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.get("/google/callback", response_model=None)
async def google_login_callback(
    session: DatabaseSession,
    state: str = Query(min_length=32, max_length=512),
    code: str | None = Query(default=None, min_length=1, max_length=4096),
    error: str | None = Query(default=None, max_length=128),
) -> RedirectResponse:
    settings = get_settings()
    now = datetime.now(UTC)

    if error:
        return _google_redirect(outcome="error", error=error[:64])

    if not code:
        return _google_redirect(outcome="error", error="missing_code")

    result = await session.execute(
        select(OAuthState).where(
            OAuthState.provider == GOOGLE_PROVIDER,
            OAuthState.state_hash == _state_hash(state),
        )
    )
    oauth_state = result.scalar_one_or_none()
    if (
        oauth_state is None
        or oauth_state.used_at is not None
        or oauth_state.expires_at <= now
    ):
        return _google_redirect(outcome="error", error="invalid_state")

    oauth_state.used_at = now
    await session.commit()

    try:
        client = GoogleClient(settings)
        tokens = await client.exchange_code(code)
        profile = await client.get_userinfo(tokens.access_token)
    except GoogleServiceError as exc:
        logger.warning("Google OAuth failed: %s", exc.public_code)
        return _google_redirect(outcome="error", error=exc.public_code)

    email = normalize_email(profile.email)
    user = await get_user_by_google_id(session, profile.sub)
    if user is None:
        user = await get_user_by_email(session, email)
        if user is not None:
            if user.google_id and user.google_id != profile.sub:
                return _google_redirect(outcome="error", error="email_linked_elsewhere")
            user.google_id = profile.sub
        else:
            given, family = _split_display_name(profile.name)
            user = User(
                email=email,
                first_name=(profile.given_name or given)[:80],
                last_name=(profile.family_name or family)[:80],
                password_hash=None,
                google_id=profile.sub,
            )
            session.add(user)

    if not user.is_active:
        return _google_redirect(outcome="error", error="account_disabled")

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        return _google_redirect(outcome="error", error="account_conflict")
    await session.refresh(user)

    # Do NOT Set-Cookie on this redirect. A Partitioned (CHIPS) cookie set during a
    # top-level navigation to the API host is keyed to the API site, so the FE
    # (different host) cannot send it on credentialed fetches — /api/auth/me 401s
    # even though opening the API URL in a tab works. Hand a one-time code to the
    # FE; it exchanges over fetch so Set-Cookie is partitioned to the FE site.
    exchange_code = secrets.token_urlsafe(48)
    session.add(
        OAuthState(
            user_id=user.id,
            provider=GOOGLE_SESSION_PROVIDER,
            state_hash=_state_hash(exchange_code),
            return_to="/app/dashboard",
            expires_at=now + timedelta(minutes=2),
        )
    )
    await session.commit()

    redirect = RedirectResponse(
        f"{settings.FRONTEND_APP_URL}/auth/complete?{urlencode({'code': exchange_code})}",
        status_code=status.HTTP_303_SEE_OTHER,
    )
    redirect.headers["Cache-Control"] = "no-store"
    return redirect


@router.post("/google/session", response_model=AuthResponse)
async def google_session_exchange(
    payload: GoogleSessionExchangeRequest,
    response: Response,
    session: DatabaseSession,
) -> AuthResponse:
    """Complete Google sign-in from the frontend (sets Partitioned cookies correctly)."""
    settings = get_settings()
    now = datetime.now(UTC)
    result = await session.execute(
        select(OAuthState).where(
            OAuthState.provider == GOOGLE_SESSION_PROVIDER,
            OAuthState.state_hash == _state_hash(payload.code),
        )
    )
    oauth_state = result.scalar_one_or_none()
    if (
        oauth_state is None
        or oauth_state.used_at is not None
        or oauth_state.expires_at <= now
        or oauth_state.user_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google sign-in expired. Please try again.",
        )

    oauth_state.used_at = now
    user = await session.get(User, oauth_state.user_id)
    if user is None or not user.is_active:
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is unavailable.",
        )
    await session.commit()

    set_auth_cookie(response, user, settings)
    response.headers["Cache-Control"] = "no-store"
    return AuthResponse(user=user)


@router.get("/me", response_model=AuthResponse)
async def me(current_user: CurrentUser) -> AuthResponse:
    return AuthResponse(user=current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> MessageResponse:
    settings = get_settings()
    current_user.token_version += 1
    await session.commit()
    delete_auth_cookies(response, settings)
    response.headers["Cache-Control"] = "no-store"
    return MessageResponse(message="Signed out")
