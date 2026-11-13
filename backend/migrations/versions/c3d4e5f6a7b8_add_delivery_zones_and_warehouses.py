"""add_delivery_zones_and_warehouses

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-11-06 21:35:00.000000

Adds delivery zones, warehouses, and updates parcels with warehouse-based delivery support.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DELIVERY_METHOD_ENUM = sa.Enum(
    "DIRECT", "VIA_WAREHOUSE",
    name="delivery_method_enum",
)

CURRENT_LOCATION_TYPE_ENUM = sa.Enum(
    "SENDER", "COURIER", "WAREHOUSE", "RECIPIENT",
    name="current_location_type_enum",
)


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    # 1. Create PostgreSQL enums if not existing
    DELIVERY_METHOD_ENUM.create(bind, checkfirst=True)
    CURRENT_LOCATION_TYPE_ENUM.create(bind, checkfirst=True)

    # 2. Create warehouses table
    if "warehouses" not in existing_tables:
        op.create_table(
            "warehouses",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("address", sa.String(length=255), nullable=False),
            sa.Column("city", sa.String(length=100), nullable=False),
            sa.Column("contact_number", sa.String(length=32), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_warehouses_id"), "warehouses", ["id"], unique=False)

    # 3. Create delivery_zones table
    if "delivery_zones" not in existing_tables:
        op.create_table(
            "delivery_zones",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("code", sa.String(length=50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("postcodes", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_delivery_zones_id"), "delivery_zones", ["id"], unique=False)
        op.create_index(op.f("ix_delivery_zones_code"), "delivery_zones", ["code"], unique=True)

    # 4. Add warehouse delivery fields to parcels table
    existing_cols = {c["name"] for c in insp.get_columns("parcels")}
    if "delivery_method" not in existing_cols:
        op.add_column(
            "parcels",
            sa.Column(
                "delivery_method",
                sa.Enum("DIRECT", "VIA_WAREHOUSE", name="delivery_method_enum"),
                nullable=False,
                server_default="DIRECT",
            ),
        )
    if "current_location_type" not in existing_cols:
        op.add_column(
            "parcels",
            sa.Column(
                "current_location_type",
                sa.Enum("SENDER", "COURIER", "WAREHOUSE", "RECIPIENT", name="current_location_type_enum"),
                nullable=False,
                server_default="SENDER",
            ),
        )
    if "current_warehouse_id" not in existing_cols:
        op.add_column(
            "parcels",
            sa.Column("current_warehouse_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_parcels_current_warehouse_id_warehouses",
            "parcels",
            "warehouses",
            ["current_warehouse_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()

    # 1. Revert parcels alterations
    op.drop_constraint("fk_parcels_current_warehouse_id_warehouses", "parcels", type_="foreignkey")
    op.drop_column("parcels", "current_warehouse_id")
    op.drop_column("parcels", "current_location_type")
    op.drop_column("parcels", "delivery_method")

    # 2. Drop delivery_zones
    op.drop_index(op.f("ix_delivery_zones_code"), table_name="delivery_zones")
    op.drop_index(op.f("ix_delivery_zones_id"), table_name="delivery_zones")
    op.drop_table("delivery_zones")

    # 3. Drop warehouses
    op.drop_index(op.f("ix_warehouses_id"), table_name="warehouses")
    op.drop_table("warehouses")

    # 4. Drop enums
    CURRENT_LOCATION_TYPE_ENUM.drop(bind, checkfirst=True)
    DELIVERY_METHOD_ENUM.drop(bind, checkfirst=True)

