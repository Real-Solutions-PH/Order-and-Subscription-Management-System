"""add_inactive_product_status

Revision ID: b7e4f9a2c1d3
Revises: a1b2c3d4e5f6
Create Date: 2026-04-12 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e4f9a2c1d3"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL < 12.
    # op.execute() with autocommit_block works correctly with both sync and
    # async engines and avoids the "isolation_level may not be altered" error.
    with op.get_context().autocommit_block():
        op.execute(sa.text("ALTER TYPE productstatus ADD VALUE IF NOT EXISTS 'inactive'"))


def downgrade() -> None:
    # PostgreSQL does not support removing enum values without recreating the type.
    # To downgrade: ensure no rows use 'inactive', then recreate the type without it.
    pass
