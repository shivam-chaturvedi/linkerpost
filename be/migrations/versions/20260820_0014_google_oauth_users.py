"""Add Google OAuth fields and nullable login password.

Revision ID: 20260820_0014
Revises: 20260820_0013
Create Date: 2026-08-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260820_0014"
down_revision: str | None = "20260820_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(length=512), nullable=True)
    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
    op.alter_column(
        "oauth_states",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "oauth_states",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_column("users", "google_id")
    op.execute("UPDATE users SET password_hash = '!' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=512), nullable=False)
