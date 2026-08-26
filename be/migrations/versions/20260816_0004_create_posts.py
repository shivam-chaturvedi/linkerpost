"""Create posts table.

Revision ID: 20260816_0004
Revises: 20260816_0003
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260816_0004"
down_revision: str | None = "20260816_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("commentary", sa.Text(), nullable=False),
        sa.Column("article_source", sa.String(length=2048), nullable=True),
        sa.Column("article_title", sa.String(length=200), nullable=True),
        sa.Column("article_description", sa.String(length=500), nullable=True),
        sa.Column("media_filename", sa.String(length=255), nullable=True),
        sa.Column("media_content_type", sa.String(length=127), nullable=True),
        sa.Column("media_size", sa.Integer(), nullable=True),
        sa.Column("media_bytes", sa.LargeBinary(), nullable=True),
        sa.Column("linkedin_media_urn", sa.String(length=512), nullable=True),
        sa.Column("linkedin_post_urn", sa.String(length=512), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_posts_scheduled_for", "posts", ["scheduled_for"])
    op.create_index("ix_posts_user_status", "posts", ["user_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_posts_user_status", table_name="posts")
    op.drop_index("ix_posts_scheduled_for", table_name="posts")
    op.drop_table("posts")
