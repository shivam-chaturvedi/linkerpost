"""Shared LinkedIn publish helper for API routes and the scheduler worker.

Publishing uses the LinkedIn OAuth tokens stored on the Account row
(``access_token_encrypted`` / ``refresh_token_encrypted``). No Linker Post
user session / JWT is required — the standalone scheduler loads the post's
``account_id`` and publishes with that account's LinkedIn Bearer token.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.token_encryption import TokenCipher, TokenDecryptionError
from app.models.account import Account
from app.models.post import Post
from app.services.linkedin import LinkedInClient, LinkedInServiceError
from app.services.linkedin_publishing import LinkedInPublishError, LinkedInPublishingClient

logger = logging.getLogger(__name__)

PUBLISH_SCOPES = {"w_member_social", "w_member_social_feed", "w_organization_social"}
# Refresh a bit before expiry so cron ticks do not race the deadline.
_TOKEN_REFRESH_SKEW = timedelta(minutes=5)


class PostPublishError(Exception):
    def __init__(self, message: str, *, http_status: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.http_status = http_status


@dataclass(frozen=True, slots=True)
class PublishOutcome:
    post: Post
    published: bool


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _flatten_scopes(scopes: list[str] | None) -> set[str]:
    flat: set[str] = set()
    for item in scopes or []:
        flat.update(part for part in re.split(r"[\s,]+", item) if part)
    return flat


def _validate_account_for_publish(account: Account, *, settings: Settings, now: datetime) -> None:
    if account.status != "active":
        raise PostPublishError(
            "LinkedIn account is not active; reconnect the account",
            http_status=409,
        )
    account_scopes = _flatten_scopes(account.scopes).union(settings.linkedin_scopes)
    if not PUBLISH_SCOPES.intersection(account_scopes):
        raise PostPublishError(
            "LinkedIn publishing permission was not granted",
            http_status=403,
        )


async def _ensure_fresh_access_token(
    session: AsyncSession,
    *,
    account: Account,
    settings: Settings,
    now: datetime,
) -> str:
    """Return a usable LinkedIn access token, refreshing from DB-stored refresh token if needed.

    This is intentionally session-free (no Linker Post JWT): only Account crypto material.
    """
    cipher = TokenCipher(settings.linkedin_token_encryption_keys)
    expires_at = ensure_utc(account.token_expires_at)
    needs_refresh = expires_at <= now + _TOKEN_REFRESH_SKEW

    if not needs_refresh:
        try:
            return cipher.decrypt(account.access_token_encrypted)
        except TokenDecryptionError as exc:
            raise PostPublishError(
                "Stored LinkedIn credentials could not be read",
                http_status=500,
            ) from exc

    if not account.refresh_token_encrypted:
        raise PostPublishError(
            "LinkedIn access has expired; reconnect the account",
            http_status=409,
        )

    if account.refresh_token_expires_at is not None and ensure_utc(
        account.refresh_token_expires_at
    ) <= now:
        account.status = "expired"
        await session.commit()
        raise PostPublishError(
            "LinkedIn access has expired; reconnect the account",
            http_status=409,
        )

    try:
        refresh_token = cipher.decrypt(account.refresh_token_encrypted)
    except TokenDecryptionError as exc:
        raise PostPublishError(
            "Stored LinkedIn credentials could not be read",
            http_status=500,
        ) from exc

    try:
        token = await LinkedInClient(settings).refresh_access_token(refresh_token)
    except LinkedInServiceError as exc:
        logger.warning(
            "LinkedIn token refresh failed stage=%s status=%s account_id=%s",
            exc.stage,
            exc.upstream_status,
            account.id,
        )
        if exc.upstream_status in {400, 401, 403}:
            account.status = "expired"
            await session.commit()
            raise PostPublishError(
                "LinkedIn access has expired; reconnect the account",
                http_status=409,
            ) from exc
        raise PostPublishError(
            "Could not refresh LinkedIn access; try again shortly",
            http_status=502,
        ) from exc

    account.access_token_encrypted = cipher.encrypt(token.access_token)
    account.token_expires_at = now + timedelta(seconds=token.expires_in)
    if token.refresh_token:
        account.refresh_token_encrypted = cipher.encrypt(token.refresh_token)
    if token.refresh_token_expires_in is not None:
        account.refresh_token_expires_at = now + timedelta(seconds=token.refresh_token_expires_in)
    if token.scope:
        account.scopes = [scope for scope in re.split(r"[\s,]+", token.scope) if scope]
    account.last_synced_at = now
    account.status = "active"
    await session.commit()
    logger.info("Refreshed LinkedIn access token account_id=%s", account.id)
    return token.access_token


async def publish_post_to_linkedin(
    session: AsyncSession,
    *,
    post: Post,
    account: Account,
    settings: Settings | None = None,
) -> PublishOutcome:
    """Publish an existing post immediately to LinkedIn using the account's stored OAuth tokens.

    Works for draft, scheduled, failed, or publishing retries.
    Safe for the standalone scheduler: no Linker Post user session is used.
    """
    settings = settings or get_settings()
    now = datetime.now(UTC)

    if post.status == "published":
        raise PostPublishError("Post is already published", http_status=400)

    _validate_account_for_publish(account, settings=settings, now=now)

    post.account_id = account.id
    post.status = "publishing"
    post.failure_reason = None
    await session.commit()

    try:
        token = await _ensure_fresh_access_token(
            session, account=account, settings=settings, now=datetime.now(UTC)
        )
        linkedin_client = LinkedInPublishingClient(settings)
        publish_result = await linkedin_client.publish(
            access_token=token,
            owner_urn=f"urn:li:person:{account.provider_account_id}",
            commentary=post.commentary,
            content_type=post.content_type,
            media_bytes=post.media_bytes,
            media_mime=post.media_content_type,
            media_title=post.media_filename,
            article_source=post.article_source,
            article_title=post.article_title,
            article_description=post.article_description,
        )
    except PostPublishError as exc:
        post.status = "failed"
        post.failure_reason = exc.message[:255]
        await session.commit()
        raise
    except LinkedInPublishError as exc:
        logger.warning(
            "LinkedIn publish failed stage=%s status=%s account_id=%s post_id=%s",
            exc.stage,
            exc.status_code,
            account.id,
            post.id,
        )
        post.status = "failed"
        post.failure_reason = exc.public_message[:255]
        await session.commit()
        raise PostPublishError(post.failure_reason, http_status=502) from exc
    except Exception as exc:
        logger.exception("Unexpected error publishing post_id=%s", post.id)
        post.status = "failed"
        post.failure_reason = f"Publish failed: {exc}"[:255]
        await session.commit()
        raise PostPublishError(post.failure_reason, http_status=500) from exc

    post.status = "published"
    post.linkedin_media_urn = publish_result.media_urn
    post.linkedin_post_urn = publish_result.post_urn
    post.published_at = datetime.now(UTC)
    post.failure_reason = None
    # Media was uploaded to LinkedIn; drop local bytes to keep the DB lean.
    post.media_bytes = None
    # Keep scheduled_for for history; status drives UI.
    await session.commit()

    if post.first_comment:
        try:
            comment_result = await linkedin_client.create_first_comment(
                access_token=token,
                owner_urn=f"urn:li:person:{account.provider_account_id}",
                post_urn=publish_result.post_urn,
                text=post.first_comment,
            )
            post.first_comment_status = "published"
            post.linkedin_comment_id = comment_result.comment_id
            post.linkedin_comment_urn = comment_result.comment_urn
            post.first_comment_error = None
        except LinkedInPublishError as exc:
            logger.warning(
                "LinkedIn first comment failed stage=%s status=%s post_id=%s",
                exc.stage,
                exc.status_code,
                post.id,
            )
            post.first_comment_status = "failed"
            post.first_comment_error = exc.public_message[:255]
        await session.commit()

    await session.refresh(post)
    return PublishOutcome(post=post, published=True)
