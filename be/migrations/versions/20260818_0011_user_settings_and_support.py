"""Add user settings, referral codes, and support tickets.

Revision ID: 20260818_0011
Revises: 20260818_0010
Create Date: 2026-08-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = "20260818_0011"
down_revision: str | None = "20260818_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("backup_email", sa.String(length=320), nullable=True),
        sa.Column("appearance", sa.String(length=16), nullable=False, server_default="Dark"),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Kolkata"),
        sa.Column("time_format", sa.String(length=16), nullable=False, server_default="12-hour"),
        sa.Column("week_start", sa.String(length=16), nullable=False, server_default="Sunday"),
        sa.Column("landing_page", sa.String(length=32), nullable=False, server_default="Dashboard"),
        sa.Column("notification_prefs", JSON, nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("referral_code", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("referral_code", name="uq_user_settings_referral_code"),
    )
    op.create_table(
        "support_tickets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="support"),
        sa.Column("category", sa.String(length=64), nullable=False, server_default="other"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_support_tickets_user_id", "support_tickets", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_support_tickets_user_id", table_name="support_tickets")
    op.drop_table("support_tickets")
    op.drop_table("user_settings")
