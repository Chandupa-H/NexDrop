"""add courier delivery history and parcel status events

Revision ID: c2d3e4f5a6b7
Revises: b7c8d9e0f1a2
Create Date: 2026-11-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("parcels", sa.Column("failure_reason", sa.Text(), nullable=True))
    op.create_table(
        "parcel_status_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("parcel_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDING",
                "PICKED_UP",
                "IN_TRANSIT",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
                name="parcel_status_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("proof_reference", sa.String(length=512), nullable=True),
        sa.Column("actor", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["parcel_id"], ["parcels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_parcel_status_history_parcel_occurred",
        "parcel_status_history",
        ["parcel_id", "occurred_at"],
    )
    op.create_index(
        "ix_parcel_status_history_id", "parcel_status_history", ["id"]
    )


def downgrade() -> None:
    op.drop_index("ix_parcel_status_history_id", table_name="parcel_status_history")
    op.drop_index(
        "ix_parcel_status_history_parcel_occurred",
        table_name="parcel_status_history",
    )
    op.drop_table("parcel_status_history")
    op.drop_column("parcels", "failure_reason")
