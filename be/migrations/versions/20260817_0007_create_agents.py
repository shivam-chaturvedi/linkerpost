"""Create agents table.

Revision ID: 20260817_0007
Revises: 20260816_0006
Create Date: 2026-08-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "20260817_0007"
down_revision: str | None = "20260816_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("needs", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("persona", sa.String(length=32), nullable=False, server_default="creator"),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="Draft only"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("auto_save_to_library", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_on_completion", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("total_runs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_run", sa.DateTime(timezone=True), nullable=True),
        sa.Column("run_cadence_datetimes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agents_user_id", "agents", ["user_id"])
    op.create_index("ix_agents_user_persona", "agents", ["user_id", "persona"])


def downgrade() -> None:
    op.drop_index("ix_agents_user_persona", table_name="agents")
    op.drop_index("ix_agents_user_id", table_name="agents")
    op.drop_table("agents")
