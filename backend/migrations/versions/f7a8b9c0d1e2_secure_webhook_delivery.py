"""Persist webhook configuration and individual delivery attempts."""
from alembic import op
import sqlalchemy as sa

revision = "f7a8b9c0d1e2"
down_revision = "da9e8f7c6b5a"
branch_labels = None
depends_on = None


def _assert_no_orphan_rows() -> None:
    bind = op.get_bind()
    checks = (
        (
            "webhook_subscriptions.merchant_id",
            "SELECT count(*) FROM webhook_subscriptions s "
            "LEFT JOIN merchants m ON m.id = s.merchant_id "
            "WHERE m.id IS NULL",
        ),
        (
            "webhook_delivery_logs.merchant_id",
            "SELECT count(*) FROM webhook_delivery_logs l "
            "LEFT JOIN merchants m ON m.id = l.merchant_id "
            "WHERE m.id IS NULL",
        ),
        (
            "webhook_delivery_logs.subscription_id",
            "SELECT count(*) FROM webhook_delivery_logs l "
            "LEFT JOIN webhook_subscriptions s ON s.id = l.subscription_id "
            "WHERE l.subscription_id IS NOT NULL AND s.id IS NULL",
        ),
    )
    for relation, query in checks:
        orphan_count = bind.execute(sa.text(query)).scalar_one()
        if orphan_count:
            raise RuntimeError(
                f"Cannot add webhook foreign key for {relation}: "
                f"{orphan_count} orphan row(s) exist."
            )


def upgrade() -> None:
    _assert_no_orphan_rows()
    op.create_table(
        "webhook_configurations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("merchant_id", sa.Integer(), nullable=False),
        sa.Column("target_url", sa.String(length=2048), nullable=False, server_default=""),
        sa.Column("encrypted_secret", sa.String(length=256), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("subscribed_events", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["merchant_id"],
            ["merchants.id"],
            name="fk_webhook_configurations_merchant_id_merchants",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("merchant_id", name="uq_webhook_configurations_merchant_id"),
    )
    op.create_index(
        op.f("ix_webhook_configurations_id"),
        "webhook_configurations",
        ["id"],
        unique=False,
    )
    op.alter_column(
        "webhook_delivery_logs",
        "target_url",
        existing_type=sa.String(length=512),
        type_=sa.String(length=2048),
        existing_nullable=False,
    )
    op.alter_column(
        "webhook_delivery_logs",
        "status_code",
        existing_type=sa.Integer(),
        nullable=True,
        existing_nullable=False,
        existing_server_default="200",
        server_default=None,
    )
    op.add_column(
        "webhook_delivery_logs",
        sa.Column("delivery_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "webhook_delivery_logs",
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "webhook_delivery_logs",
        sa.Column("delivery_status", sa.String(length=16), nullable=False, server_default="unknown"),
    )
    op.add_column(
        "webhook_delivery_logs",
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_foreign_key(
        "fk_webhook_subscriptions_merchant_id_merchants",
        "webhook_subscriptions",
        "merchants",
        ["merchant_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_webhook_delivery_logs_merchant_id_merchants",
        "webhook_delivery_logs",
        "merchants",
        ["merchant_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_webhook_delivery_logs_subscription_id_webhook_subscriptions",
        "webhook_delivery_logs",
        "webhook_subscriptions",
        ["subscription_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_webhook_delivery_logs_delivery_id"),
        "webhook_delivery_logs",
        ["delivery_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_webhook_delivery_logs_subscription_id"),
        "webhook_delivery_logs",
        ["subscription_id"],
        unique=False,
    )


def downgrade() -> None:
    raise RuntimeError(
        "This migration is intentionally irreversible to preserve webhook records."
    )
