"""Add merchant ownership and payment fields to parcels.

Revision ID: da9e8f7c6b5a
Revises: a7b8c9d0e2f3
Create Date: 2026-11-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "da9e8f7c6b5a"
down_revision: Union[str, None] = "a7b8c9d0e2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "parcels",
        sa.Column("merchant_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_parcels_merchant_id", "parcels", ["merchant_id"])
    op.create_foreign_key(
        "fk_parcels_merchant_id_merchants",
        "parcels",
        "merchants",
        ["merchant_id"],
        ["id"],
    )
    op.add_column(
        "parcels",
        sa.Column("cod_amount", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "parcels",
        sa.Column("is_prepaid", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("parcels", "is_prepaid")
    op.drop_column("parcels", "cod_amount")
    op.drop_constraint(
        "fk_parcels_merchant_id_merchants",
        "parcels",
        type_="foreignkey",
    )
    op.drop_index("ix_parcels_merchant_id", table_name="parcels")
    op.drop_column("parcels", "merchant_id")
