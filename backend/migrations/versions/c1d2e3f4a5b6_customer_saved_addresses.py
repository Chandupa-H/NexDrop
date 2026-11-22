"""customer_saved_addresses

Revision ID: c1d2e3f4a5b6
Revises: a1b2c3d4e5f6
Create Date: 2026-11-09 12:00:00.000000

Adds the customer_addresses table for saved pickup and drop-off addresses.

Safe to run on both kinds of database:
- a fresh database: the table and indexes are created;
- the shared database, where the table already exists (it was created outside
  Alembic, without server defaults): the missing defaults and indexes are added
  and nothing is dropped or recreated.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "customer_addresses"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table(TABLE):
        op.create_table(
            TABLE,
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
        op.create_index(op.f("ix_customer_addresses_id"), TABLE, ["id"], unique=False)
        op.create_index(op.f("ix_customer_addresses_customer_id"), TABLE, ["customer_id"], unique=False)
        return

    # Table already exists: only add what is missing.
    op.alter_column(
        TABLE, "address_type",
        existing_type=sa.String(length=32), existing_nullable=False,
        server_default="pickup",
    )
    op.alter_column(
        TABLE, "is_default",
        existing_type=sa.Boolean(), existing_nullable=False,
        server_default=sa.text("false"),
    )
    op.alter_column(
        TABLE, "created_at",
        existing_type=sa.DateTime(timezone=True), existing_nullable=False,
        server_default=sa.func.now(),
    )
    op.alter_column(
        TABLE, "updated_at",
        existing_type=sa.DateTime(timezone=True), existing_nullable=False,
        server_default=sa.func.now(),
    )

    existing_indexes = {index["name"] for index in inspector.get_indexes(TABLE)}
    if "ix_customer_addresses_id" not in existing_indexes:
        op.create_index(op.f("ix_customer_addresses_id"), TABLE, ["id"], unique=False)
    if "ix_customer_addresses_customer_id" not in existing_indexes:
        op.create_index(op.f("ix_customer_addresses_customer_id"), TABLE, ["customer_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_customer_addresses_customer_id"), table_name=TABLE)
    op.drop_index(op.f("ix_customer_addresses_id"), table_name=TABLE)
    op.drop_table(TABLE)
