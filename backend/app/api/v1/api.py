from fastapi import APIRouter
from app.api.v1.endpoints.health import router as health_router
from app.modules.auth.routes import router as auth_router
from app.modules.users.routes import router as users_router
from app.modules.customers.routes import router as customers_router
from app.modules.merchants.routes import router as merchants_router
from app.modules.couriers.routes import router as couriers_router
from app.modules.parcels.routes import router as parcels_router
from app.modules.dispatch.routes import router as dispatch_router
from app.modules.pricing.routes import router as pricing_router
from app.modules.notifications.routes import router as notifications_router
from app.modules.webhooks.routes import router as webhooks_router

api_router = APIRouter()

# Health check
api_router.include_router(health_router)

# Feature Modules
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(customers_router)
api_router.include_router(merchants_router)
api_router.include_router(couriers_router)
api_router.include_router(parcels_router)
api_router.include_router(dispatch_router)
api_router.include_router(pricing_router)
api_router.include_router(notifications_router)
api_router.include_router(webhooks_router)
