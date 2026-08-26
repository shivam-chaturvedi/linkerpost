from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

DEFAULT_NOTIFICATION_PREFS = {
    "post_failures": True,
    "channel_updates": True,
    "collaboration": True,
    "publish_confirmations": False,
    "empty_queue": False,
    "billing": True,
    "daily_recap": True,
    "weekly_report": True,
}


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    backup_email: Mapped[str | None] = mapped_column(String(320))
    headline: Mapped[str | None] = mapped_column(String(160))
    bio: Mapped[str | None] = mapped_column(Text)
    company: Mapped[str | None] = mapped_column(String(120))
    appearance: Mapped[str] = mapped_column(String(16), nullable=False, default="Dark")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Kolkata")
    time_format: Mapped[str] = mapped_column(String(16), nullable=False, default="12-hour")
    week_start: Mapped[str] = mapped_column(String(16), nullable=False, default="Sunday")
    landing_page: Mapped[str] = mapped_column(String(32), nullable=False, default="Dashboard")
    notification_prefs: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=lambda: dict(DEFAULT_NOTIFICATION_PREFS)
    )
    referral_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    user = relationship("User", back_populates="settings")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="support")
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="other")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
