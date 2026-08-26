from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    body: str
    kind: str
    agent_id: UUID | None
    run_id: UUID | None
    read_at: datetime | None
    created_at: datetime
    read: bool = False


class NotificationsResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int
