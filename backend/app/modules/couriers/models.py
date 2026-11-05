import enum
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Date, Enum, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class CourierApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Courier(Base, TimestampMixin):
    __tablename__ = "couriers"
    __table_args__ = (UniqueConstraint("nic_number", name="uq_couriers_nic_number"), UniqueConstraint("phone", name="uq_couriers_phone"))

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False)  # bike, motorbike, van, truck
    license_plate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    current_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_of_birth: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    nic_number: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    alternative_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    residential_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    vehicle_brand: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    vehicle_model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    vehicle_color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vehicle_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    driving_licence_number: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    driving_licence_expiry: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact_relationship: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    document_files: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    approval_status: Mapped[CourierApprovalStatus] = mapped_column(
        Enum(
            CourierApprovalStatus,
            name="courier_approval_status_enum",
            values_callable=lambda statuses: [status.value for status in statuses],
        ),
        default=CourierApprovalStatus.PENDING,
        nullable=False,
    )
