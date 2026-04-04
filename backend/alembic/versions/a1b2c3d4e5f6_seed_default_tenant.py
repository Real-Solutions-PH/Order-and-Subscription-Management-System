"""seed default tenant

Revision ID: a1b2c3d4e5f6
Revises: b88bb57ae855
Create Date: 2026-04-05 12:00:00.000000

"""
from typing import Sequence, Union
from uuid import UUID, uuid4

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "b88bb57ae855"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TENANT_ID = str(UUID("00000000-0000-0000-0000-000000000001"))


def upgrade() -> None:
    # Seed default tenant
    op.execute(
        sa.text(
            """
            INSERT INTO tenants (id, name, slug, status)
            VALUES (CAST(:id AS uuid), :name, :slug, 'active')
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(
            id=DEFAULT_TENANT_ID,
            name="Default",
            slug="default",
        )
    )

    # Seed tenant config with sensible defaults
    tenant_config_id = str(uuid4())
    op.execute(
        sa.text(
            """
            INSERT INTO tenant_configs (id, tenant_id, business_name, timezone, currency, tax_rate, tax_label, order_cutoff_hours, max_pause_days)
            VALUES (CAST(:id AS uuid), CAST(:tenant_id AS uuid), :business_name, :timezone, :currency, :tax_rate, :tax_label, :order_cutoff_hours, :max_pause_days)
            ON CONFLICT (tenant_id) DO NOTHING
            """
        ).bindparams(
            id=tenant_config_id,
            tenant_id=DEFAULT_TENANT_ID,
            business_name="PrepFlow",
            timezone="Asia/Manila",
            currency="PHP",
            tax_rate=0.12,
            tax_label="VAT",
            order_cutoff_hours=24,
            max_pause_days=30,
        )
    )

    # Seed customer role (required by auth registration flow)
    customer_role_id = str(uuid4())
    op.execute(
        sa.text(
            """
            INSERT INTO roles (id, tenant_id, name, description, is_system, hierarchy_level)
            VALUES (CAST(:id AS uuid), CAST(:tenant_id AS uuid), :name, :description, true, 0)
            ON CONFLICT DO NOTHING
            """
        ).bindparams(
            id=customer_role_id,
            tenant_id=DEFAULT_TENANT_ID,
            name="customer",
            description="Default customer role",
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM roles WHERE tenant_id = CAST(:tid AS uuid) AND name = 'customer'").bindparams(tid=DEFAULT_TENANT_ID)
    )
    op.execute(
        sa.text("DELETE FROM tenant_configs WHERE tenant_id = CAST(:tid AS uuid)").bindparams(tid=DEFAULT_TENANT_ID)
    )
    op.execute(
        sa.text("DELETE FROM tenants WHERE id = CAST(:tid AS uuid)").bindparams(tid=DEFAULT_TENANT_ID)
    )
