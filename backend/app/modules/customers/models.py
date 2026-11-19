from typing import Optional, List
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    default_address: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    addresses: Mapped[List["CustomerAddress"]] = relationship(
        "CustomerAddress",
        back_populates="customer",
        cascade="all, delete-orphan",
        order_by="CustomerAddress.id",
    )


class CustomerAddress(Base, TimestampMixin):
    __tablename__ = "customer_addresses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    address_type: Mapped[str] = mapped_column(String(32), default="pickup", nullable=False)  # "pickup" or "dropoff"
    label: Mapped[str] = mapped_column(String(64), nullable=False)  # "Home", "Office", "Depot", "Other"
    custom_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="addresses")
