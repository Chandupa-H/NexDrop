import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.pricing.models import PricingTier

logger = logging.getLogger(__name__)

# Fallback in-memory storage for Admin Pricing Rules (rates in Sri Lankan Rupees - Rs.)
_FALLBACK_RULES: Dict[str, Any] = {
    "currency": "LKR",
    "currency_symbol": "Rs.",
    "base_fare": 350.0,
    "per_km_rate": 120.0,
    "express_surcharge": 250.0,
    "peak_surge_max": 1.50,
    "rain_surge": 1.30,
    "base_distance_km": 2.0,
    "algorithmic_surge_active": True,
    "updated_at": datetime.now(timezone.utc),
}

# Fallback in-memory tiers in Sri Lankan Rupees (Rs.)
_FALLBACK_TIERS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Standard Delivery",
        "base_rate": 350.0,
        "per_km_rate": 120.0,
        "per_kg_rate": 50.0,
        "currency": "Rs.",
        "is_active": True,
        "created_at": datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
    },
    {
        "id": 2,
        "name": "Express Priority",
        "base_rate": 600.0,
        "per_km_rate": 150.0,
        "per_kg_rate": 80.0,
        "currency": "Rs.",
        "is_active": True,
        "created_at": datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
    },
    {
        "id": 3,
        "name": "Same-Day Rush",
        "base_rate": 850.0,
        "per_km_rate": 200.0,
        "per_kg_rate": 100.0,
        "currency": "Rs.",
        "is_active": True,
        "created_at": datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
    },
]


class PricingRepository:
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def get_by_id(self, tier_id: int) -> Optional[Any]:
        if self.session is not None:
            try:
                result = await self.session.execute(
                    select(PricingTier).where(PricingTier.id == tier_id)
                )
                db_tier = result.scalars().first()
                if db_tier:
                    return db_tier
            except Exception as exc:
                logger.warning("DB query failed, using in-memory pricing tiers: %s", exc)

        for t in _FALLBACK_TIERS:
            if t["id"] == tier_id:
                return t
        return None

    async def get_by_name(self, name: str) -> Optional[Any]:
        if self.session is not None:
            try:
                result = await self.session.execute(
                    select(PricingTier).where(PricingTier.name.ilike(name))
                )
                db_tier = result.scalars().first()
                if db_tier:
                    return db_tier
            except Exception as exc:
                logger.warning("DB query failed, using in-memory pricing tiers: %s", exc)

        search = name.lower()
        for t in _FALLBACK_TIERS:
            if search in t["name"].lower() or t["name"].lower() in search:
                return t
        return None

    async def list_active(self) -> List[Any]:
        if self.session is not None:
            try:
                result = await self.session.execute(
                    select(PricingTier).where(PricingTier.is_active.is_(True))
                )
                db_tiers = list(result.scalars().all())
                if db_tiers:
                    return db_tiers
            except Exception as exc:
                logger.warning("DB query failed, using in-memory pricing tiers: %s", exc)

        return [t for t in _FALLBACK_TIERS if t.get("is_active", True)]

    async def create(self, tier: PricingTier) -> Any:
        if self.session is not None:
            try:
                self.session.add(tier)
                await self.session.flush()
                await self.session.refresh(tier)
                return tier
            except Exception as exc:
                logger.warning("DB create failed, creating in-memory tier: %s", exc)

        new_id = max((t["id"] for t in _FALLBACK_TIERS), default=0) + 1
        now = datetime.now(timezone.utc)
        record = {
            "id": new_id,
            "name": tier.name,
            "base_rate": tier.base_rate,
            "per_km_rate": tier.per_km_rate,
            "per_kg_rate": tier.per_kg_rate,
            "currency": getattr(tier, "currency", "Rs."),
            "is_active": tier.is_active,
            "created_at": now,
            "updated_at": now,
        }
        _FALLBACK_TIERS.append(record)
        return record

    async def update_tier(self, tier_id: int, updates: Dict[str, Any]) -> Optional[Any]:
        if self.session is not None:
            try:
                result = await self.session.execute(
                    select(PricingTier).where(PricingTier.id == tier_id)
                )
                db_tier = result.scalars().first()
                if db_tier:
                    for k, v in updates.items():
                        if v is not None and hasattr(db_tier, k):
                            setattr(db_tier, k, v)
                    await self.session.flush()
                    await self.session.refresh(db_tier)
                    return db_tier
            except Exception as exc:
                logger.warning("DB update failed, updating in-memory tier: %s", exc)

        for t in _FALLBACK_TIERS:
            if t["id"] == tier_id:
                for k, v in updates.items():
                    if v is not None:
                        t[k] = v
                t["updated_at"] = datetime.now(timezone.utc)
                return t
        return None

    async def get_admin_rules(self) -> Dict[str, Any]:
        return _FALLBACK_RULES.copy()

    async def update_admin_rules(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        for k, v in updates.items():
            if v is not None and k in _FALLBACK_RULES:
                _FALLBACK_RULES[k] = v
        _FALLBACK_RULES["updated_at"] = datetime.now(timezone.utc)

        # Sync base tier if base_fare or per_km_rate was updated
        if "base_fare" in updates and updates["base_fare"] is not None:
            _FALLBACK_TIERS[0]["base_rate"] = float(updates["base_fare"])
        if "per_km_rate" in updates and updates["per_km_rate"] is not None:
            _FALLBACK_TIERS[0]["per_km_rate"] = float(updates["per_km_rate"])

        return _FALLBACK_RULES.copy()
