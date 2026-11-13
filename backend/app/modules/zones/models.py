from typing import Optional, Any
from sqlalchemy import String, Boolean, Float, Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class DeliveryZone(Base, TimestampMixin):
    __tablename__ = "delivery_zones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    postcodes: Mapped[Optional[Any]] = mapped_column(JSON, default=list, nullable=True)
    hub_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    base_fee: Mapped[Optional[float]] = mapped_column(Float, default=350.0, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), default="Rs.", nullable=True)
    avg_delivery_time_mins: Mapped[Optional[int]] = mapped_column(Integer, default=30, nullable=True)
    active_couriers: Mapped[Optional[int]] = mapped_column(Integer, default=0, nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(50), default="active", nullable=True)
    surge_multiplier: Mapped[Optional[float]] = mapped_column(Float, default=1.0, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
