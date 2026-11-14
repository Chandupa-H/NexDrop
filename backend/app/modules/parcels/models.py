
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    String,
    Integer,
    Float,
    Enum,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ParcelStatus(str, enum.Enum):
    PENDING = "pending"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DeliveryMethod(str, enum.Enum):
    DIRECT = "DIRECT"
    VIA_WAREHOUSE = "VIA_WAREHOUSE"


class CurrentLocationType(str, enum.Enum):
    SENDER = "SENDER"
    COURIER = "COURIER"
    WAREHOUSE = "WAREHOUSE"
    RECIPIENT = "RECIPIENT"


# LocationType alias for convenience
LocationType = CurrentLocationType


class Parcel(Base, TimestampMixin):
    __tablename__ = "parcels"

    id: Mapped[int] = mapped_column(
        primary_key=True, index=True, autoincrement=True
    )
    tracking_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    sender_id: Mapped[int] = mapped_column(Integer, nullable=False)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    delivery_recipient_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    recipient_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    delivery_address: Mapped[str] = mapped_column(String(255), nullable=False)
    delivery_city: Mapped[str] = mapped_column(String(100), nullable=False)

    pickup_address: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    pickup_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pickup_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dropoff_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dropoff_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    weight_kg: Mapped[float] = mapped_column(
        Float, default=1.0, nullable=False
    )
    dimensions: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )

    status: Mapped[ParcelStatus] = mapped_column(
        Enum(ParcelStatus, name="parcel_status_enum"),
        default=ParcelStatus.PENDING,
        nullable=False,
    )

    special_instructions: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Delivery history branch
    failure_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Courier dashboard branch
    delivery_method: Mapped[DeliveryMethod] = mapped_column(
        Enum(DeliveryMethod, name="delivery_method_enum"),
        default=DeliveryMethod.DIRECT,
        nullable=False,
    )

    current_location_type: Mapped[CurrentLocationType] = mapped_column(
        Enum(CurrentLocationType, name="current_location_type_enum"),
        default=CurrentLocationType.SENDER,
        nullable=False,
    )

    current_warehouse_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("warehouses.id"),
        nullable=True,
    )


class ParcelStatusHistory(Base):
    __tablename__ = "parcel_status_history"

    __table_args__ = (
        Index(
            "ix_parcel_status_history_parcel_occurred",
            "parcel_id",
            "occurred_at",
        ),
        Index(
            "ix_parcel_status_history_parcel_status_occurred",
            "parcel_id",
            "status",
            "occurred_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True, index=True, autoincrement=True
    )

    parcel_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("parcels.id", ondelete="CASCADE"),
        nullable=False,
    )

    status: Mapped[ParcelStatus] = mapped_column(
        Enum(ParcelStatus, name="parcel_status_enum"),
        nullable=False,
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    proof_reference: Mapped[Optional[str]] = mapped_column(
        String(512), nullable=True
    )

    proof_public_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    actor: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
