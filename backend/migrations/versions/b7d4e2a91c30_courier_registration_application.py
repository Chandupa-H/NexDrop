"""courier registration application fields and review status

Revision ID: b7d4e2a91c30
Revises: a1b2c3d4e5f6
Create Date: 2026-11-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7d4e2a91c30"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    courier_status = sa.Enum("pending", "approved", "rejected", name="courier_approval_status_enum")
    courier_status.create(op.get_bind(), checkfirst=True)
    columns = [
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(32), nullable=True),
        sa.Column("nic_number", sa.String(16), nullable=True),
        sa.Column("nationality", sa.String(80), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("alternative_phone", sa.String(20), nullable=True),
        sa.Column("residential_address", sa.String(500), nullable=True),
        sa.Column("city", sa.String(120), nullable=True),
        sa.Column("district", sa.String(80), nullable=True),
        sa.Column("postal_code", sa.String(12), nullable=True),
        sa.Column("vehicle_brand", sa.String(80), nullable=True),
        sa.Column("vehicle_model", sa.String(80), nullable=True),
        sa.Column("vehicle_color", sa.String(50), nullable=True),
        sa.Column("vehicle_year", sa.Integer(), nullable=True),
        sa.Column("driving_licence_number", sa.String(40), nullable=True),
        sa.Column("driving_licence_expiry", sa.Date(), nullable=True),
        sa.Column("emergency_contact_name", sa.String(255), nullable=True),
        sa.Column("emergency_contact_relationship", sa.String(80), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(20), nullable=True),
        sa.Column("document_files", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        # Existing fleet records were already operational; keep them approved.
        sa.Column("approval_status", courier_status, nullable=False, server_default="approved"),
    ]
    for column in columns:
        op.add_column("couriers", column)
    op.alter_column(
        "couriers", "approval_status", existing_type=courier_status,
        existing_nullable=False, server_default="pending",
    )
    op.create_unique_constraint("uq_couriers_nic_number", "couriers", ["nic_number"])
    op.create_unique_constraint("uq_couriers_phone", "couriers", ["phone"])


def downgrade() -> None:
    op.drop_constraint("uq_couriers_phone", "couriers", type_="unique")
    op.drop_constraint("uq_couriers_nic_number", "couriers", type_="unique")
    for column in (
        "approval_status", "document_files", "emergency_contact_phone",
        "emergency_contact_relationship", "emergency_contact_name",
        "driving_licence_expiry", "driving_licence_number", "vehicle_year",
        "vehicle_color", "vehicle_model", "vehicle_brand", "postal_code",
        "district", "city", "residential_address", "alternative_phone", "phone",
        "nationality", "nic_number", "gender", "date_of_birth",
    ):
        op.drop_column("couriers", column)
    sa.Enum(name="courier_approval_status_enum").drop(op.get_bind(), checkfirst=True)
