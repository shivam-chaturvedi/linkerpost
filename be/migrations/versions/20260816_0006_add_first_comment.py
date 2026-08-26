"""Add first comment fields to posts.

Revision ID: 20260816_0006
Revises: 20260816_0005
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260816_0006"
down_revision: str | None = "20260816_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("first_comment", sa.Text(), nullable=True))
    op.add_column("posts", sa.Column("first_comment_status", sa.String(length=32), nullable=True))
    op.add_column("posts", sa.Column("first_comment_error", sa.String(length=255), nullable=True))
    op.add_column("posts", sa.Column("linkedin_comment_id", sa.String(length=255), nullable=True))
    op.add_column("posts", sa.Column("linkedin_comment_urn", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "linkedin_comment_urn")
    op.drop_column("posts", "linkedin_comment_id")
    op.drop_column("posts", "first_comment_error")
    op.drop_column("posts", "first_comment_status")
    op.drop_column("posts", "first_comment")
