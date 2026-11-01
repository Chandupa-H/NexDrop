import enum
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Merchant(Base, TimestampMixin):
    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Core business identity
    business_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    business_address: Mapped[str] = mapped_column(String(255), nullable=False)

    # Optional registration fields
    business_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Admin approval workflow
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="merchant_approval_status_enum"),
        default=ApprovalStatus.PENDING,
        nullable=False,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # API access key (issued after approval)
    api_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)
