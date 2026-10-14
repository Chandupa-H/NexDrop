import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class DispatchStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"


class DispatchAssignment(Base, TimestampMixin):
    __tablename__ = "dispatch_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    parcel_id: Mapped[int] = mapped_column(Integer, ForeignKey("parcels.id"), nullable=False)
    courier_id: Mapped[int] = mapped_column(Integer, ForeignKey("couriers.id"), nullable=False)
    status: Mapped[DispatchStatus] = mapped_column(
        Enum(DispatchStatus, name="dispatch_status_enum"),
        default=DispatchStatus.ASSIGNED,
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
