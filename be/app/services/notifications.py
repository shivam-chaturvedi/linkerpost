from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification

AUTO_PUBLISH_MODE = "Auto publish"


async def create_user_notification(
    session: AsyncSession,
    *,
    user_id: UUID,
    title: str,
    body: str,
    kind: str = "agent_run",
    agent_id: UUID | None = None,
    run_id: UUID | None = None,
) -> Notification:
    notification = Notification(
        id=uuid4(),
        user_id=user_id,
        title=title[:255],
        body=body,
        kind=kind,
        agent_id=agent_id,
        run_id=run_id,
    )
    session.add(notification)
    return notification
