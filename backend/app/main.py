import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.integrations.rabbitmq.client import rabbitmq_client
from app.integrations.websockets.manager import ws_manager
from app.modules.dispatch.events import setup_delivery_monitoring_consumer

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexdrop")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager for clean startup and shutdown events.
    Does not crash if optional external services (DB, RabbitMQ) are unavailable.
    """
    logger.info("Starting %s v%s in %s mode...", settings.PROJECT_NAME, settings.VERSION, settings.ENVIRONMENT)

    # Initialize optional messaging connection
    try:
        await rabbitmq_client.connect()
        setup_delivery_monitoring_consumer()
    except Exception as exc:
        logger.warning("RabbitMQ connection skipped: %s", exc)

    yield

    # Clean shutdown
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    try:
        await rabbitmq_client.disconnect()
    except Exception as exc:
        logger.warning("RabbitMQ disconnect error: %s", exc)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NexDrop Modular Monolith Backend API for Parcel Delivery & Courier Management",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Versioned API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }


@app.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: str):
    """
    Real-time WebSocket endpoint for live courier tracking and notifications.
    """
    await ws_manager.connect(websocket, channel_id)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.broadcast_to_channel(channel_id, {"echo": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel_id)
