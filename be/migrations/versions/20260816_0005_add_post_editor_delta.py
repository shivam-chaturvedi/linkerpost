"""Add Quill editor delta to posts.

Revision ID: 20260816_0005
Revises: 20260816_0004
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260816_0005"
down_revision: str | None = "20260816_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("editor_delta", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "editor_delta")
