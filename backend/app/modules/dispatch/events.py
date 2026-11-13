import logging
from datetime import datetime, timezone
from app.integrations.rabbitmq.client import rabbitmq_client
from app.integrations.websockets.manager import ws_manager

logger = logging.getLogger(__name__)

_consumer_initialized = False


async def handle_delivery_event(routing_key: str, message: dict) -> None:
    """
    Active Delivery Monitoring Consumer:
    Consumes parcel and courier status events from RabbitMQ and broadcasts
    real-time live delivery updates to connected dashboard WebSockets.
    """
    logger.info("Consumed active delivery event from RabbitMQ [%s]: %s", routing_key, message)

    payload = {
        "type": "ACTIVE_DELIVERY_UPDATE",
        "event": routing_key,
        "data": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Broadcast live updates to dispatcher dashboard and delivery monitoring channels
    await ws_manager.broadcast_to_channel("dispatcher", payload)
    await ws_manager.broadcast_to_channel("deliveries", payload)
    await ws_manager.broadcast_to_channel("global", payload)


def setup_delivery_monitoring_consumer() -> None:
    """
    Subscribe the delivery monitoring consumer to RabbitMQ parcel & dispatch routing keys.
    """
    global _consumer_initialized
    if _consumer_initialized:
        return

    # Subscribe to parcel status updates and courier assignments
    rabbitmq_client.subscribe("parcel.status.*", handle_delivery_event)
    rabbitmq_client.subscribe("dispatch.courier.*", handle_delivery_event)
    rabbitmq_client.subscribe("dispatch.status.*", handle_delivery_event)
    rabbitmq_client.subscribe("dispatch.warehouse.*", handle_delivery_event)

    _consumer_initialized = True
    logger.info("Active delivery monitoring RabbitMQ consumer initialized.")

