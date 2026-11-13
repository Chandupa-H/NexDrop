"""delivery tracking fields and latest courier locations

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-11-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("parcels", sa.Column("pickup_address", sa.String(length=255), nullable=True))
    op.add_column("parcels", sa.Column("pickup_lat", sa.Float(), nullable=True))
    op.add_column("parcels", sa.Column("pickup_lng", sa.Float(), nullable=True))
    op.add_column("parcels", sa.Column("dropoff_lat", sa.Float(), nullable=True))
    op.add_column("parcels", sa.Column("dropoff_lng", sa.Float(), nullable=True))
    op.create_table(
        "courier_locations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("courier_id", sa.Integer(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("heading", sa.Float(), nullable=True),
        sa.Column("speed", sa.Float(), nullable=True),
        sa.Column("active_delivery_id", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["courier_id"], ["couriers.id"]),
        sa.ForeignKeyConstraint(["active_delivery_id"], ["parcels.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("courier_id", name="uq_courier_locations_courier_id"),
    )
    op.create_index(
        "ix_courier_locations_courier_id", "courier_locations", ["courier_id"]
    )
    op.create_index("ix_courier_locations_id", "courier_locations", ["id"])


def downgrade() -> None:
    op.drop_index("ix_courier_locations_id", table_name="courier_locations")
    op.drop_index("ix_courier_locations_courier_id", table_name="courier_locations")
    op.drop_table("courier_locations")
    op.drop_column("parcels", "dropoff_lng")
    op.drop_column("parcels", "dropoff_lat")
    op.drop_column("parcels", "pickup_lng")
    op.drop_column("parcels", "pickup_lat")
    op.drop_column("parcels", "pickup_address")
