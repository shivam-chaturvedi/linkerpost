from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContentRun(Base):
    __tablename__ = "content_runs"
    __table_args__ = (Index("ix_content_runs_user_id", "user_id"),)

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    model: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    content_plan: Mapped[dict | None] = mapped_column(JSON)
    content_strategy: Mapped[list | None] = mapped_column(JSON)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ContentSource(Base):
    __tablename__ = "content_sources"
    __table_args__ = (Index("ix_content_sources_run_id", "run_id"),)

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("content_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_key: Mapped[str] = mapped_column(String(64), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    author: Mapped[str | None] = mapped_column(String(255))
    published_at: Mapped[str | None] = mapped_column(String(64))
    source_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    images: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    videos: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    scores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    final_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


class GeneratedPost(Base):
    __tablename__ = "generated_posts"
    __table_args__ = (
        Index("ix_generated_posts_run_id", "run_id"),
        Index("ix_generated_posts_user_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("content_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    first_comment: Mapped[str | None] = mapped_column(Text)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    images: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    videos: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    articles: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    source_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    linkedin_post_id: Mapped[str | None] = mapped_column(String(512))
    post_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("posts.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
