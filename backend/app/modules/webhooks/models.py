from typing import Optional
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    Text,
    JSON,
    ForeignKey,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class WebhookConfiguration(Base, TimestampMixin):
    __tablename__ = "webhook_configurations"
    __table_args__ = (
        UniqueConstraint(
            "merchant_id",
            name="uq_webhook_configurations_merchant_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "merchants.id",
            name="fk_webhook_configurations_merchant_id_merchants",
        ),
        nullable=False,
    )
    target_url: Mapped[str] = mapped_column(
        String(2048),
        default="",
        server_default="",
        nullable=False,
    )
    encrypted_secret: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=false(),
        nullable=False,
    )
    subscribed_events: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)


class WebhookSubscription(Base, TimestampMixin):
    __tablename__ = "webhook_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "merchants.id",
            name="fk_webhook_subscriptions_merchant_id_merchants",
        ),
        index=True,
        nullable=False,
    )
    target_url: Mapped[str] = mapped_column(String(512), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., order.picked_up, order.delivered, or '*'
    secret_token: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class WebhookDeliveryLog(Base, TimestampMixin):
    __tablename__ = "webhook_delivery_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "merchants.id",
            name="fk_webhook_delivery_logs_merchant_id_merchants",
        ),
        index=True,
        nullable=False,
    )
    subscription_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey(
            "webhook_subscriptions.id",
            name="fk_webhook_delivery_logs_subscription_id_webhook_subscriptions",
        ),
        nullable=True,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    delivery_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    attempt_number: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )
    delivery_status: Mapped[str] = mapped_column(
        String(16),
        default="pending",
        server_default="unknown",
        nullable=False,
    )
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status_text: Mapped[str] = mapped_column(String(64), default="OK", nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payload_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
