"""merchant_api_keys_and_webhook_logs

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-12 16:45:00.000000

Adds merchant API key / OAuth credentials and webhook delivery logs table:
  - merchants.test_api_key (varchar 128)
  - merchants.client_id (varchar 64)
  - merchants.client_secret (varchar 128)
  - webhook_delivery_logs table
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add API credentials columns to merchants table
    op.add_column("merchants", sa.Column("test_api_key", sa.String(length=128), nullable=True))
    op.add_column("merchants", sa.Column("client_id", sa.String(length=64), nullable=True))
    op.add_column("merchants", sa.Column("client_secret", sa.String(length=128), nullable=True))
    op.create_unique_constraint("uq_merchants_client_id", "merchants", ["client_id"])

    # 2. Create webhook_delivery_logs table
    op.create_table(
        "webhook_delivery_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("merchant_id", sa.Integer(), nullable=False),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("tracking_number", sa.String(length=64), nullable=True),
        sa.Column("target_url", sa.String(length=512), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("status_text", sa.String(length=64), nullable=False, server_default="OK"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload_summary", sa.Text(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_webhook_delivery_logs_id"), "webhook_delivery_logs", ["id"], unique=False)
    op.create_index(op.f("ix_webhook_delivery_logs_merchant_id"), "webhook_delivery_logs", ["merchant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_webhook_delivery_logs_merchant_id"), table_name="webhook_delivery_logs")
    op.drop_index(op.f("ix_webhook_delivery_logs_id"), table_name="webhook_delivery_logs")
    op.drop_table("webhook_delivery_logs")
    op.drop_constraint("uq_merchants_client_id", "merchants", type_="unique")
    op.drop_column("merchants", "client_secret")
    op.drop_column("merchants", "client_id")
    op.drop_column("merchants", "test_api_key")
