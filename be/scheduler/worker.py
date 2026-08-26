"""Due-post worker used by the standalone scheduler FastAPI app.

No Linker Post user session is involved. For each due post we load the
LinkedIn ``Account`` row referenced by ``post.account_id`` and publish with
that account's stored OAuth access token (refreshing via refresh_token when
needed).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import AsyncSessionFactory
from app.models.account import Account
from app.models.post import Post
from app.services.post_publisher import PostPublishError, ensure_utc, publish_post_to_linkedin

logger = logging.getLogger(__name__)


async def process_due_scheduled_posts() -> dict[str, int]:
    """Fetch scheduled posts with scheduled_for <= now (UTC) and publish them."""
    settings = get_settings()
    now = datetime.now(UTC)
    published = 0
    failed = 0
    skipped = 0

    async with AsyncSessionFactory() as session:
        result = await session.execute(
            select(Post.id)
            .where(
                Post.status == "scheduled",
                Post.scheduled_for.is_not(None),
                Post.scheduled_for <= now,
            )
            .order_by(Post.scheduled_for.asc())
            .limit(settings.SCHEDULER_BATCH_SIZE)
        )
        due_ids: list[UUID] = list(result.scalars().all())

    for post_id in due_ids:
        async with AsyncSessionFactory() as session:
            locked = await session.execute(
                select(Post).where(Post.id == post_id).with_for_update(skip_locked=True)
            )
            post = locked.scalar_one_or_none()
            if post is None:
                skipped += 1
                continue
            if post.status != "scheduled" or post.scheduled_for is None:
                skipped += 1
                continue
            if ensure_utc(post.scheduled_for) > datetime.now(UTC):
                skipped += 1
                continue

            if post.account_id is None:
                post.status = "failed"
                post.failure_reason = "No LinkedIn account selected for scheduled publish"
                await session.commit()
                failed += 1
                logger.warning("Scheduled post %s has no account_id", post.id)
                continue

            # Account tokens only — never a Linker Post session cookie/JWT.
            account = await session.get(Account, post.account_id)
            if account is None or account.user_id != post.user_id:
                post.status = "failed"
                post.failure_reason = "LinkedIn account missing for scheduled publish"
                await session.commit()
                failed += 1
                logger.warning("Scheduled post %s account missing", post.id)
                continue

            try:
                await publish_post_to_linkedin(
                    session, post=post, account=account, settings=settings
                )
                published += 1
                logger.info(
                    "Published scheduled post %s account_id=%s at %s",
                    post.id,
                    account.id,
                    datetime.now(UTC).isoformat(),
                )
            except PostPublishError as exc:
                failed += 1
                logger.warning(
                    "Failed publishing scheduled post %s: %s",
                    post.id,
                    exc.message,
                )

    return {
        "published": published,
        "failed": failed,
        "skipped": skipped,
        "claimed": len(due_ids),
    }
