from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_user_status", "user_id", "status"),
        Index("ix_posts_scheduled_for", "scheduled_for"),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    commentary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    editor_delta: Mapped[str | None] = mapped_column(Text)
    first_comment: Mapped[str | None] = mapped_column(Text)
    first_comment_status: Mapped[str | None] = mapped_column(String(32))
    first_comment_error: Mapped[str | None] = mapped_column(String(255))
    article_source: Mapped[str | None] = mapped_column(String(2048))
    article_title: Mapped[str | None] = mapped_column(String(200))
    article_description: Mapped[str | None] = mapped_column(String(500))
    media_filename: Mapped[str | None] = mapped_column(String(255))
    media_content_type: Mapped[str | None] = mapped_column(String(127))
    media_size: Mapped[int | None]
    media_bytes: Mapped[bytes | None] = mapped_column(LargeBinary)
    linkedin_media_urn: Mapped[str | None] = mapped_column(String(512))
    linkedin_post_urn: Mapped[str | None] = mapped_column(String(512))
    linkedin_comment_id: Mapped[str | None] = mapped_column(String(255))
    linkedin_comment_urn: Mapped[str | None] = mapped_column(String(512))
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failure_reason: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
