from sqlalchemy import String, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class PricingTier(Base, TimestampMixin):
    """
    Pricing tier configuration model (default rates in Sri Lankan Rupees - Rs.).
    """
    __tablename__ = "pricing_tiers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # Standard, Express, SameDay
    base_rate: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    per_km_rate: Mapped[float] = mapped_column(Float, default=1.5, nullable=False)
    per_kg_rate: Mapped[float] = mapped_column(Float, default=0.8, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
