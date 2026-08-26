from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PublicConfigResponse(BaseModel):
    pricing_enabled: bool


class NotificationPrefs(BaseModel):
    post_failures: bool = True
    channel_updates: bool = True
    collaboration: bool = True
    publish_confirmations: bool = False
    empty_queue: bool = False
    billing: bool = True
    daily_recap: bool = True
    weekly_report: bool = True


class UserSettingsResponse(BaseModel):
    backup_email: str | None = None
    headline: str | None = None
    bio: str | None = None
    company: str | None = None
    appearance: str
    timezone: str
    time_format: str
    week_start: str
    landing_page: str
    notification_prefs: NotificationPrefs
    referral_code: str
    referral_url: str


class UpdateProfileRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    headline: str | None = Field(default=None, max_length=160)
    bio: str | None = Field(default=None, max_length=500)
    company: str | None = Field(default=None, max_length=120)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UpdateUserSettingsRequest(BaseModel):
    appearance: Literal["Dark", "Light"] | None = None
    timezone: str | None = Field(default=None, max_length=64)
    time_format: Literal["12-hour", "24-hour"] | None = None
    week_start: Literal["Sunday", "Monday"] | None = None
    landing_page: Literal["Dashboard", "Calendar", "Create"] | None = None
    notification_prefs: NotificationPrefs | None = None


class CreateSupportTicketRequest(BaseModel):
    kind: Literal["support", "feature", "feedback"] = "support"
    category: str = Field(default="other", max_length=64)
    title: str = Field(min_length=3, max_length=255)
    body: str = Field(min_length=8, max_length=4000)


class SupportTicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: str
    category: str
    title: str
    body: str
    created_at: datetime
