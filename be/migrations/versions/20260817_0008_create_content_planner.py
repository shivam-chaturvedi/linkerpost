"""Create content planner run, source, and generated post tables.

Revision ID: 20260817_0008
Revises: 20260817_0007
Create Date: 2026-08-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = "20260817_0008"
down_revision: str | None = "20260817_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "content_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("input_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("model", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("content_plan", JSON, nullable=True),
        sa.Column("content_strategy", JSON, nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_content_runs_user_id", "content_runs", ["user_id"])

    op.create_table(
        "content_sources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("content_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_key", sa.String(length=64), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("author", sa.String(length=255), nullable=True),
        sa.Column("published_at", sa.String(length=64), nullable=True),
        sa.Column("source_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("language", sa.String(length=16), nullable=False, server_default="en"),
        sa.Column("images", JSON, nullable=False, server_default="[]"),
        sa.Column("videos", JSON, nullable=False, server_default="[]"),
        sa.Column("scores", JSON, nullable=False, server_default="{}"),
        sa.Column("final_score", sa.Float(), nullable=False, server_default="0"),
    )
    op.create_index("ix_content_sources_run_id", "content_sources", ["run_id"])

    op.create_table(
        "generated_posts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("content_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("first_comment", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("images", JSON, nullable=False, server_default="[]"),
        sa.Column("videos", JSON, nullable=False, server_default="[]"),
        sa.Column("articles", JSON, nullable=False, server_default="[]"),
        sa.Column("source_ids", JSON, nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("linkedin_post_id", sa.String(length=512), nullable=True),
        sa.Column(
            "post_id",
            UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_generated_posts_run_id", "generated_posts", ["run_id"])
    op.create_index("ix_generated_posts_user_id", "generated_posts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_generated_posts_user_id", table_name="generated_posts")
    op.drop_index("ix_generated_posts_run_id", table_name="generated_posts")
    op.drop_table("generated_posts")
    op.drop_index("ix_content_sources_run_id", table_name="content_sources")
    op.drop_table("content_sources")
    op.drop_index("ix_content_runs_user_id", table_name="content_runs")
    op.drop_table("content_runs")
