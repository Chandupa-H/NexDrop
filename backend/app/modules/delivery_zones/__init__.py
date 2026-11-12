"""
Delivery Zones module alias for app.modules.zones.
"""
from app.modules.zones import *  # noqa: F401, F403
from app.modules.zones.models import DeliveryZone
from app.modules.zones.schemas import (
    DeliveryZoneBase,
    DeliveryZoneCreate,
    DeliveryZoneUpdate,
    DeliveryZoneResponse,
)
from app.modules.zones.repository import ZoneRepository, DeliveryZoneRepository
from app.modules.zones.service import ZoneService, DeliveryZoneService
from app.modules.zones.routes import router as zones_router

