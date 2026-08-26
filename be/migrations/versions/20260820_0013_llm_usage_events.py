"""Create llm_usage_events for per-user token and cost tracking.

Revision ID: 20260820_0013
Revises: 20260818_0012
Create Date: 2026-08-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260820_0013"
down_revision: str | None = "20260818_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "llm_usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("feature", sa.String(length=64), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cached_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_cost_usd", sa.Numeric(precision=12, scale=8), nullable=False, server_default="0"),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_llm_usage_events_user_date", "llm_usage_events", ["user_id", "usage_date"])
    op.create_index("ix_llm_usage_events_user_feature", "llm_usage_events", ["user_id", "feature"])
    op.create_index("ix_llm_usage_events_user_run", "llm_usage_events", ["user_id", "run_id"])
    op.create_index("ix_llm_usage_events_created_at", "llm_usage_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_llm_usage_events_created_at", table_name="llm_usage_events")
    op.drop_index("ix_llm_usage_events_user_run", table_name="llm_usage_events")
    op.drop_index("ix_llm_usage_events_user_feature", table_name="llm_usage_events")
    op.drop_index("ix_llm_usage_events_user_date", table_name="llm_usage_events")
    op.drop_table("llm_usage_events")
