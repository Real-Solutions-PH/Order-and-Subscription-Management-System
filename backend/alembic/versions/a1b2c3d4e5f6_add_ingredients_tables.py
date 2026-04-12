"""add_ingredients_tables

Revision ID: a1b2c3d4e5f6
Revises: df662565f47b
Create Date: 2026-04-12 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "df662565f47b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingredients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("default_unit", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "name", name="uq_ingredient_tenant_name"),
    )
    op.create_index(op.f("ix_ingredients_tenant_id"), "ingredients", ["tenant_id"])

    op.create_table(
        "product_ingredients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 3), nullable=True),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("notes", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["ingredient_id"], ["ingredients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "ingredient_id", name="uq_product_ingredient"),
    )
    op.create_index(
        op.f("ix_product_ingredients_product_id"), "product_ingredients", ["product_id"]
    )
    op.create_index(
        op.f("ix_product_ingredients_ingredient_id"),
        "product_ingredients",
        ["ingredient_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_product_ingredients_ingredient_id"), table_name="product_ingredients"
    )
    op.drop_index(
        op.f("ix_product_ingredients_product_id"), table_name="product_ingredients"
    )
    op.drop_table("product_ingredients")
    op.drop_index(op.f("ix_ingredients_tenant_id"), table_name="ingredients")
    op.drop_table("ingredients")
