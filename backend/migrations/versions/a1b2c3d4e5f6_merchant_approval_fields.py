"""merchant_approval_fields

Revision ID: a1b2c3d4e5f6
Revises: 3e6620a0080b
Create Date: 2026-10-31 11:10:00.000000

Adds approval workflow columns to the merchants table:
  - approval_status (enum: pending / approved / rejected)
  - rejection_reason (text, nullable)
  - business_type (varchar, nullable)
  - website_url (varchar, nullable)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3e6620a0080b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum type name must match the SQLAlchemy model definition exactly.
APPROVAL_STATUS_ENUM = sa.Enum(
    "pending", "approved", "rejected",
    name="merchant_approval_status_enum",
)


def upgrade() -> None:
    # 1. Create the new postgres enum type
    APPROVAL_STATUS_ENUM.create(op.get_bind(), checkfirst=True)

    # 2. Add new columns to merchants table
    op.add_column(
        "merchants",
        sa.Column(
            "approval_status",
            sa.Enum("pending", "approved", "rejected", name="merchant_approval_status_enum"),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "merchants",
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "merchants",
        sa.Column("business_type", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "merchants",
        sa.Column("website_url", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("merchants", "website_url")
    op.drop_column("merchants", "business_type")
    op.drop_column("merchants", "rejection_reason")
    op.drop_column("merchants", "approval_status")
    APPROVAL_STATUS_ENUM.drop(op.get_bind(), checkfirst=True)
