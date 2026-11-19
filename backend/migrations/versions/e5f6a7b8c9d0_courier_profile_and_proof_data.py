"""Persist courier profile and delivery result data."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("contact_phone", sa.String(length=32), nullable=True))
    op.add_column(
        "parcels",
        sa.Column("delivery_recipient_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "parcel_status_history",
        sa.Column("proof_public_id", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("parcel_status_history", "proof_public_id")
    op.drop_column("parcels", "delivery_recipient_name")
    op.drop_column("users", "contact_phone")
