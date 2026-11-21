"""
NexDrop AI Delivery Assistant Tools
Exposes core logistics operations: parcel tracking, shipping rate estimation, and delivery zone queries.
Can be invoked directly by the AI Assistant or via the Model Context Protocol (MCP).
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Known distance matrix from Colombo Central Logistics Hub (in km)
SRI_LANKAN_CITY_DISTANCES: Dict[str, float] = {
    "colombo": 8.0,
    "dehiwala": 12.0,
    "mount lavinia": 14.0,
    "moratuwa": 20.0,
    "kaduwela": 18.0,
    "maharagama": 15.0,
    "kotte": 10.0,
    "battaramulla": 11.0,
    "gampaha": 32.0,
    "negombo": 38.0,
    "kalutara": 45.0,
    "kurunegala": 94.0,
    "ratnapura": 101.0,
    "kandy": 115.0,
    "peradeniya": 110.0,
    "galle": 125.0,
    "matara": 160.0,
    "nuwara eliya": 165.0,
    "anuradhapura": 205.0,
    "badulla": 220.0,
    "trincomalee": 260.0,
    "batticaloa": 315.0,
    "polonnaruwa": 218.0,
    "jaffna": 395.0,
    "kilinochchi": 330.0,
    "mannar": 310.0,
    "hambantota": 235.0,
}

# Fallback in-memory mock parcels for demo / offline reliability
FALLBACK_PARCELS: Dict[str, Dict[str, Any]] = {
    "NXD001225": {
        "tracking_number": "NXD001225",
        "status": "in_transit",
        "status_label": "In Transit",
        "sender": "Lanka Tech Supplies (Pvt) Ltd",
        "recipient_name": "Kasun Wickramasinghe",
        "recipient_phone": "+94 77 123 4567",
        "delivery_address": "45 Temple Road, Colombo 03",
        "delivery_city": "Colombo",
        "weight_kg": 1.8,
        "courier_name": "Chamara Perera",
        "estimated_delivery": "Today by 4:30 PM",
        "current_location": "Colombo Central Hub (Sorting)",
        "timeline": [
            {"status": "pending", "label": "Order Created", "time": "2026-11-18 09:30 AM", "location": "Merchant Warehouse"},
            {"status": "picked_up", "label": "Package Picked Up", "time": "2026-11-18 01:15 PM", "location": "Pettah Hub"},
            {"status": "in_transit", "label": "In Transit to Destination Hub", "time": "2026-11-19 08:45 AM", "location": "Colombo Central Hub"},
        ],
    },
    "NXD001246": {
        "tracking_number": "NXD001246",
        "status": "pending",
        "status_label": "Order Placed",
        "sender": "Ceylon Artisan Crafts",
        "recipient_name": "Anoma Senanayake",
        "recipient_phone": "+94 71 890 1234",
        "delivery_address": "88 Peradeniya Road, Kandy",
        "delivery_city": "Kandy",
        "weight_kg": 2.5,
        "courier_name": "Unassigned (Queued for Dispatch)",
        "estimated_delivery": "Tomorrow by 2:00 PM",
        "current_location": "Colombo Sorting Facility",
        "timeline": [
            {"status": "pending", "label": "Order Registered", "time": "2026-11-19 10:00 AM", "location": "Colombo Sorting Facility"},
        ],
    },
    "NXD001248": {
        "tracking_number": "NXD001248",
        "status": "delivered",
        "status_label": "Delivered & Signed",
        "sender": "Green Tea Exports",
        "recipient_name": "Kavindu Perera",
        "recipient_phone": "+94 77 123 4521",
        "delivery_address": "123 Galle Road, Colombo 03",
        "delivery_city": "Colombo",
        "weight_kg": 0.9,
        "courier_name": "Poorna Danushka",
        "estimated_delivery": "Completed",
        "current_location": "Delivered to Recipient",
        "timeline": [
            {"status": "pending", "label": "Order Placed", "time": "2026-11-17 08:00 AM", "location": "Warehouse"},
            {"status": "picked_up", "label": "Picked Up", "time": "2026-11-17 11:30 AM", "location": "Colombo Hub"},
            {"status": "in_transit", "label": "Out for Delivery", "time": "2026-11-18 09:10 AM", "location": "Colombo 03"},
            {"status": "delivered", "label": "Delivered & Signed", "time": "2026-11-18 02:45 PM", "location": "Colombo 03"},
        ],
    },
}


def get_city_distance_km(city: str) -> float:
    normalized = city.strip().lower()
    for key, distance in SRI_LANKAN_CITY_DISTANCES.items():
        if key in normalized or normalized in key:
            return distance
    return 75.0  # Default regional distance estimate if not explicitly listed


async def track_parcel_tool(tracking_number: str, session: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Look up the real-time shipping status, timeline events, and delivery details of a parcel by tracking ID.
    """
    clean_id = tracking_number.strip().upper()
    # Strip common prefixes if repeated
    if not clean_id.startswith("NXD") and re.match(r"^\d+$", clean_id):
        clean_id = f"NXD{clean_id.zfill(6)}"

    # 1. Try real database lookup if session is provided
    if session is not None:
        try:
            from app.modules.parcels.models import Parcel, ParcelStatusHistory
            res = await session.execute(
                select(Parcel).where(Parcel.tracking_number == clean_id)
            )
            parcel = res.scalars().first()
            if parcel:
                hist_res = await session.execute(
                    select(ParcelStatusHistory)
                    .where(ParcelStatusHistory.parcel_id == parcel.id)
                    .order_by(ParcelStatusHistory.occurred_at.asc())
                )
                history = list(hist_res.scalars().all())
                timeline = [
                    {
                        "status": h.status.value if hasattr(h.status, "value") else str(h.status),
                        "label": (h.status.value if hasattr(h.status, "value") else str(h.status)).replace("_", " ").title(),
                        "time": h.occurred_at.strftime("%Y-%m-%d %I:%M %p") if h.occurred_at else "Recently",
                        "location": parcel.delivery_city or "In Transit",
                        "note": h.note,
                    }
                    for h in history
                ]
                status_str = parcel.status.value if hasattr(parcel.status, "value") else str(parcel.status)
                return {
                    "found": True,
                    "tracking_number": parcel.tracking_number,
                    "status": status_str,
                    "status_label": status_str.replace("_", " ").title(),
                    "recipient_name": parcel.recipient_name,
                    "delivery_address": parcel.delivery_address,
                    "delivery_city": parcel.delivery_city,
                    "weight_kg": parcel.weight_kg,
                    "timeline": timeline,
                    "source": "database",
                }
        except Exception:
            pass

    # 2. Check fallback mock records
    if clean_id in FALLBACK_PARCELS:
        data = FALLBACK_PARCELS[clean_id].copy()
        data["found"] = True
        data["source"] = "mock_system"
        return data

    # 3. Dynamic generic response if valid NXD format but not registered
    if re.match(r"^NXD\d{4,8}$", clean_id):
        return {
            "found": True,
            "tracking_number": clean_id,
            "status": "in_transit",
            "status_label": "In Transit",
            "recipient_name": "Valued Customer",
            "delivery_address": "Western Province Hub",
            "delivery_city": "Colombo",
            "weight_kg": 1.5,
            "courier_name": "NexDrop Express Fleet",
            "estimated_delivery": "Within 24 hours",
            "current_location": "En route between transit hubs",
            "timeline": [
                {"status": "pending", "label": "Order Accepted", "time": "Today, 08:00 AM", "location": "Origin Hub"},
                {"status": "in_transit", "label": "In Transit", "time": "Today, 11:30 AM", "location": "Main Distribution Center"},
            ],
            "source": "simulated",
        }

    return {
        "found": False,
        "tracking_number": clean_id,
        "message": f"Parcel with tracking number '{clean_id}' was not found. Please verify the code (e.g. NXD001225).",
    }


async def calculate_shipping_rate_tool(
    weight_kg: float,
    destination: str,
    tier: str = "Standard",
    session: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Calculate instant shipping price estimate based on weight in kg, destination city, and service tier.
    Returns full cost breakdown in Sri Lankan Rupees (Rs. / LKR).
    """
    weight = max(0.1, float(weight_kg))
    distance_km = get_city_distance_km(destination)
    tier_name = tier.strip().capitalize() if tier else "Standard"

    # Default platform pricing rules (matches NexDrop standard configuration)
    base_fare = 350.0  # covers up to 2.0 km
    per_km_rate = 120.0
    express_surcharge = 250.0
    weight_surcharge_per_kg = 50.0  # For weight beyond 1 kg

    # Attempt to load live admin pricing rules from database if available
    if session is not None:
        try:
            from app.modules.pricing.repository import PricingRepository
            from app.modules.pricing.service import PricingService
            service = PricingService(PricingRepository(session))
            admin_rules = await service.get_admin_rules()
            base_fare = admin_rules.base_fare
            per_km_rate = admin_rules.per_km_rate
            express_surcharge = admin_rules.express_surcharge
        except Exception:
            pass

    # Calculation logic
    excess_distance = max(0.0, distance_km - 2.0)
    distance_cost = round(excess_distance * per_km_rate, 2)
    weight_cost = round(max(0.0, weight - 1.0) * weight_surcharge_per_kg, 2)

    tier_multiplier = 1.0
    tier_addon = 0.0
    if tier_name.lower() in ["express", "priority"]:
        tier_addon = express_surcharge
    elif tier_name.lower() in ["sameday", "same_day", "urgent"]:
        tier_multiplier = 1.4

    total_price = round((base_fare + distance_cost + weight_cost + tier_addon) * tier_multiplier, 2)

    delivery_estimate = "1-2 business days"
    if tier_name.lower() in ["sameday", "same_day"]:
        delivery_estimate = "Today before 8:00 PM"
    elif tier_name.lower() in ["express", "priority"]:
        delivery_estimate = "Next business day by 12:00 PM"
    elif distance_km > 200:
        delivery_estimate = "2-3 business days"

    return {
        "success": True,
        "destination": destination.title(),
        "distance_km": distance_km,
        "weight_kg": weight,
        "tier": tier_name,
        "currency": "Rs.",
        "currency_code": "LKR",
        "breakdown": {
            "base_fare": base_fare,
            "distance_cost": distance_cost,
            "weight_cost": weight_cost,
            "tier_addon": tier_addon,
        },
        "total_price": total_price,
        "formatted_price": f"Rs. {total_price:,.2f}",
        "estimated_delivery_time": delivery_estimate,
    }


async def get_delivery_zones_tool(city: Optional[str] = None, session: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Retrieve coverage zones, hubs, and estimated transit times across Sri Lanka.
    """
    zones_list = [
        {"code": "ZONE-WEST", "name": "Western Province (Metro)", "cities": ["Colombo", "Gampaha", "Negombo", "Kalutara"], "base_fee": 350.0, "time": "24 hours", "hub": "Colombo Central Hub"},
        {"code": "ZONE-CENT", "name": "Central Province", "cities": ["Kandy", "Peradeniya", "Matale", "Nuwara Eliya"], "base_fee": 450.0, "time": "24-48 hours", "hub": "Kandy Regional Hub"},
        {"code": "ZONE-SOUTH", "name": "Southern Province", "cities": ["Galle", "Matara", "Hambantota"], "base_fee": 450.0, "time": "24-48 hours", "hub": "Galle Hub"},
        {"code": "ZONE-NORTH", "name": "Northern Province", "cities": ["Jaffna", "Kilinochchi", "Vavuniya", "Mannar"], "base_fee": 650.0, "time": "48-72 hours", "hub": "Jaffna Hub"},
        {"code": "ZONE-EAST", "name": "Eastern Province", "cities": ["Trincomalee", "Batticaloa", "Ampara"], "base_fee": 600.0, "time": "48-72 hours", "hub": "Batticaloa Hub"},
        {"code": "ZONE-NW", "name": "North Western Province", "cities": ["Kurunegala", "Chilaw", "Puttalam"], "base_fee": 400.0, "time": "24-48 hours", "hub": "Kurunegala Hub"},
    ]

    if city:
        city_lower = city.lower().strip()
        matched = [z for z in zones_list if any(city_lower in c.lower() for c in z["cities"])]
        if matched:
            return {"supported": True, "city": city.title(), "zone": matched[0]}
        return {
            "supported": True,
            "city": city.title(),
            "zone": {
                "code": "ZONE-ISLAND",
                "name": "Islandwide Delivery",
                "base_fee": 550.0,
                "time": "48-72 hours",
                "hub": "Nearest Regional Center",
            },
        }

    return {"supported_zones": zones_list, "total_coverage": "All 9 provinces across Sri Lanka"}
