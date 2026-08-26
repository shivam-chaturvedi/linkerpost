"""Expand stored LinkedIn OIDC profile fields.

Revision ID: 20260816_0003
Revises: 20260816_0002
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260816_0003"
down_revision: str | None = "20260816_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("given_name", sa.String(length=120), nullable=True))
    op.add_column("accounts", sa.Column("family_name", sa.String(length=120), nullable=True))
    op.add_column("accounts", sa.Column("email_verified", sa.Boolean(), nullable=True))
    op.add_column(
        "accounts",
        sa.Column("locale", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.alter_column(
        "accounts",
        "profile_image_url",
        existing_type=sa.String(length=2048),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "accounts",
        "profile_image_url",
        existing_type=sa.Text(),
        type_=sa.String(length=2048),
        existing_nullable=True,
    )
    op.drop_column("accounts", "locale")
    op.drop_column("accounts", "email_verified")
    op.drop_column("accounts", "family_name")
    op.drop_column("accounts", "given_name")
