from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class Courier(Base, TimestampMixin):
    __tablename__ = "couriers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False)  # bike, motorbike, van, truck
    license_plate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    current_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CourierLocation(Base):
    __tablename__ = "courier_locations"
    __table_args__ = (UniqueConstraint("courier_id", name="uq_courier_locations_courier_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    courier_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("couriers.id"), nullable=False, index=True
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    heading: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    active_delivery_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("parcels.id"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
