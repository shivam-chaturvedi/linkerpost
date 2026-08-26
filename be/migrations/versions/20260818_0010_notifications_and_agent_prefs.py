"""Add notifications, per-user agent settings, and library save flag.

Revision ID: 20260818_0010
Revises: 20260817_0009
Create Date: 2026-08-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "20260818_0010"
down_revision: str | None = "20260817_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

AUTO_PUBLISH = "Auto publish"


def upgrade() -> None:
    op.add_column(
        "agent_runs",
        sa.Column(
            "saved_to_library",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.execute(
        sa.text(
            "UPDATE agent_runs SET saved_to_library = true WHERE status = 'completed'"
        )
    )
    op.create_index("ix_agent_runs_saved_to_library", "agent_runs", ["user_id", "saved_to_library"])

    op.execute(sa.text("UPDATE agents SET mode = :mode").bindparams(mode=AUTO_PUBLISH))
    op.alter_column(
        "agents",
        "mode",
        existing_type=sa.String(length=32),
        server_default=AUTO_PUBLISH,
        existing_nullable=False,
    )

    op.create_table(
        "agent_user_settings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "agent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "auto_save_to_library",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "notify_on_completion",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("next_run", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "run_cadence_datetimes",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "agent_id", name="uq_agent_user_settings_user_agent"),
    )
    op.create_index("ix_agent_user_settings_user_id", "agent_user_settings", ["user_id"])

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="agent_run"),
        sa.Column(
            "agent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("agent_runs.run_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "read_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_unread", table_name="notifications")
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_agent_user_settings_user_id", table_name="agent_user_settings")
    op.drop_table("agent_user_settings")
    op.drop_index("ix_agent_runs_saved_to_library", table_name="agent_runs")
    op.drop_column("agent_runs", "saved_to_library")
    op.alter_column(
        "agents",
        "mode",
        existing_type=sa.String(length=32),
        server_default="Draft only",
        existing_nullable=False,
    )
