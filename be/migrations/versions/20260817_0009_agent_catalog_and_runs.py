"""Replace mock agents with the AI Content Planner catalog and add agent_runs.

Revision ID: 20260817_0009
Revises: 20260817_0008
Create Date: 2026-08-17
"""

from collections.abc import Sequence
from uuid import UUID, uuid5

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID

revision: str = "20260817_0009"
down_revision: str | None = "20260817_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATALOG_NAMESPACE = UUID("7c1a4d2e-8f3b-4e9a-9c1d-0a2b3c4d5e6f")
AI_CONTENT_PLANNER_ID = uuid5(CATALOG_NAMESPACE, "ai_content_planner")


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM agents"))
    op.alter_column("agents", "user_id", existing_type=PGUUID(as_uuid=True), nullable=True)
    op.add_column(
        "agents",
        sa.Column("agent_name", sa.String(length=64), nullable=False, server_default="unregistered"),
    )
    op.create_index("uq_agents_agent_name", "agents", ["agent_name"], unique=True)
    op.execute(
        sa.text(
            """
            INSERT INTO agents (
                id, user_id, agent_name, key, name, description, needs, persona, mode,
                is_active, auto_save_to_library, notify_on_completion, total_runs,
                run_cadence_datetimes
            ) VALUES (
                :id, NULL, 'ai_content_planner', 'ai_content_planner', 'AI Content Planner',
                'Turns a topic into a sourced LinkedIn content calendar, drafts, and media.',
                'Natural-language brief (topic, days, tone, cadence)',
                'creator', 'Draft only', true, true, true, 0, '[]'::json
            )
            """
        ).bindparams(id=AI_CONTENT_PLANNER_ID)
    )
    op.alter_column("agents", "agent_name", server_default=None)

    op.create_table(
        "agent_runs",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", PGUUID(as_uuid=True), nullable=False),
        sa.Column(
            "user_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "agent_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("input", sa.Text(), nullable=False),
        sa.Column("output", JSON, nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_agent_runs_user_id", "agent_runs", ["user_id"])
    op.create_index("ix_agent_runs_agent_id", "agent_runs", ["agent_id"])
    op.create_index("ix_agent_runs_run_id", "agent_runs", ["run_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_agent_runs_run_id", table_name="agent_runs")
    op.drop_index("ix_agent_runs_agent_id", table_name="agent_runs")
    op.drop_index("ix_agent_runs_user_id", table_name="agent_runs")
    op.drop_table("agent_runs")
    op.execute(sa.text("DELETE FROM agents"))
    op.drop_index("uq_agents_agent_name", table_name="agents")
    op.drop_column("agents", "agent_name")
    op.alter_column("agents", "user_id", existing_type=PGUUID(as_uuid=True), nullable=False)
