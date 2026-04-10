"""replace_is_superuser_with_role

Revision ID: df662565f47b
Revises: f1fa59f56af0
Create Date: 2026-04-11 02:16:35.718730
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df662565f47b'
down_revision: Union[str, None] = 'f1fa59f56af0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = sa.Enum('customer', 'admin', 'superadmin', name='user_role')


def upgrade() -> None:
    # Create the enum type explicitly before using it
    user_role_enum.create(op.get_bind())

    # Add role column with a server default so existing rows get a value
    op.add_column('users', sa.Column(
        'role',
        user_role_enum,
        nullable=False,
        server_default='customer',
    ))

    # Migrate data from is_superuser to role
    op.execute("UPDATE users SET role = 'superadmin' WHERE is_superuser = true")
    op.execute("UPDATE users SET role = 'customer' WHERE is_superuser = false")

    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.drop_column('users', 'is_superuser')

    # Remove server default now that all rows are populated
    op.alter_column('users', 'role', server_default=None)


def downgrade() -> None:
    op.add_column('users', sa.Column('is_superuser', sa.BOOLEAN(), autoincrement=False, nullable=False, server_default=sa.text('false')))

    # Migrate data back
    op.execute("UPDATE users SET is_superuser = true WHERE role = 'superadmin'")
    op.execute("UPDATE users SET is_superuser = false WHERE role != 'superadmin'")

    op.alter_column('users', 'is_superuser', server_default=None)
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.drop_column('users', 'role')
    user_role_enum.drop(op.get_bind())
