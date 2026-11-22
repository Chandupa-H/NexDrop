"""Add delivery passcode fields to parcels."""

from alembic import op


revision = "j4k5l6m7n8o9"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE parcels "
        "ADD COLUMN IF NOT EXISTS delivery_passcode VARCHAR(16) NULL"
    )
    op.execute(
        "ALTER TABLE parcels "
        "ADD COLUMN IF NOT EXISTS delivery_passcode_verified BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE parcels DROP COLUMN IF EXISTS delivery_passcode_verified")
    op.execute("ALTER TABLE parcels DROP COLUMN IF EXISTS delivery_passcode")
