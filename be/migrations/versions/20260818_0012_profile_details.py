"""Add profile headline, bio, and company to user settings.

Revision ID: 20260818_0012
Revises: 20260818_0011
Create Date: 2026-08-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260818_0012"
down_revision: str | None = "20260818_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user_settings", sa.Column("headline", sa.String(length=160), nullable=True))
    op.add_column("user_settings", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("user_settings", sa.Column("company", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("user_settings", "company")
    op.drop_column("user_settings", "bio")
    op.drop_column("user_settings", "headline")
