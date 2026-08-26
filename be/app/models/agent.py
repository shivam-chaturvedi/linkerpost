from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = (
        Index("ix_agents_user_id", "user_id"),
        Index("ix_agents_user_persona", "user_id", "persona"),
        Index("uq_agents_agent_name", "agent_name", unique=True),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    agent_name: Mapped[str] = mapped_column(String(64), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    needs: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    persona: Mapped[str] = mapped_column(String(32), nullable=False, default="creator")
    mode: Mapped[str] = mapped_column(String(32), nullable=False, default="Auto publish")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_save_to_library: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notify_on_completion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    total_runs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_run: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    run_cadence_datetimes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AgentRun(Base):
    __tablename__ = "agent_runs"
    __table_args__ = (
        Index("ix_agent_runs_user_id", "user_id"),
        Index("ix_agent_runs_agent_id", "agent_id"),
        Index("ix_agent_runs_run_id", "run_id", unique=True),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    input: Mapped[str] = mapped_column(Text, nullable=False)
    output: Mapped[dict | list | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")
    error_message: Mapped[str | None] = mapped_column(Text)
    saved_to_library: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AgentUserSettings(Base):
    __tablename__ = "agent_user_settings"
    __table_args__ = (
        Index("ix_agent_user_settings_user_id", "user_id"),
        Index("uq_agent_user_settings_user_agent", "user_id", "agent_id", unique=True),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_save_to_library: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notify_on_completion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    next_run: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    run_cadence_datetimes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
