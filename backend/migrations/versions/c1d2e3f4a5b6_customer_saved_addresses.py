"""customer_saved_addresses

Revision ID: c1d2e3f4a5b6
Revises: a1b2c3d4e5f6
Create Date: 2026-11-09 12:00:00.000000

Adds the customer_addresses table for saved pickup and drop-off addresses.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customer_addresses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("address_type", sa.String(length=32), server_default="pickup", nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("custom_name", sa.String(length=100), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("postal_code", sa.String(length=20), nullable=False),
        sa.Column("contact_name", sa.String(length=100), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customer_addresses_id"), "customer_addresses", ["id"], unique=False)
    op.create_index(op.f("ix_customer_addresses_customer_id"), "customer_addresses", ["customer_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_customer_addresses_customer_id"), table_name="customer_addresses")
    op.drop_index(op.f("ix_customer_addresses_id"), table_name="customer_addresses")
    op.drop_table("customer_addresses")
