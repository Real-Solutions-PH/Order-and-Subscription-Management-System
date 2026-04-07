"""Drop redundant subscription_cycle_id FK from orders table.

The SubscriptionCycle -> Order relationship is already handled via
subscription_cycles.order_id. Having a second FK (orders.subscription_cycle_id)
pointing back created an invalid bidirectional MANYTOONE in SQLAlchemy.

Revision ID: c2d3e4f5a6b7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("fk_orders_subscription_cycle_id", "orders", type_="foreignkey")
    op.drop_column("orders", "subscription_cycle_id")


def downgrade() -> None:
    op.add_column("orders", sa.Column("subscription_cycle_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_orders_subscription_cycle_id",
        "orders",
        "subscription_cycles",
        ["subscription_cycle_id"],
        ["id"],
    )
