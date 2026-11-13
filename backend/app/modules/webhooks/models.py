from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class WebhookSubscription(Base, TimestampMixin):
    __tablename__ = "webhook_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    target_url: Mapped[str] = mapped_column(String(512), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., order.picked_up, order.delivered, or '*'
    secret_token: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class WebhookDeliveryLog(Base, TimestampMixin):
    __tablename__ = "webhook_delivery_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    merchant_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subscription_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_url: Mapped[str] = mapped_column(String(512), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    status_text: Mapped[str] = mapped_column(String(64), default="OK", nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payload_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
