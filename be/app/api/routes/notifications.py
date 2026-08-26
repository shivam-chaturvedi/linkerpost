from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationsResponse, UnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_response(row: Notification) -> NotificationResponse:
    payload = NotificationResponse.model_validate(row)
    payload.read = row.read_at is not None
    return payload


@router.get("", response_model=NotificationsResponse)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> NotificationsResponse:
    rows = list(
        (
            await session.execute(
                select(Notification)
                .where(Notification.user_id == current_user.id)
                .order_by(Notification.created_at.desc())
                .limit(50)
            )
        ).scalars().all()
    )
    unread = int(
        (
            await session.execute(
                select(func.count())
                .select_from(Notification)
                .where(Notification.user_id == current_user.id, Notification.read_at.is_(None))
            )
        ).scalar_one()
    )
    return NotificationsResponse(
        notifications=[_to_response(row) for row in rows],
        unread_count=unread,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UnreadCountResponse:
    unread = int(
        (
            await session.execute(
                select(func.count())
                .select_from(Notification)
                .where(Notification.user_id == current_user.id, Notification.read_at.is_(None))
            )
        ).scalar_one()
    )
    return UnreadCountResponse(unread_count=unread)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> NotificationResponse:
    row = (
        await session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(row)
    return _to_response(row)


@router.post("/read-all", response_model=UnreadCountResponse)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UnreadCountResponse:
    await session.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    await session.commit()
    return UnreadCountResponse(unread_count=0)
