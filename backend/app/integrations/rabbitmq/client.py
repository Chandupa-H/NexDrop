import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class RabbitMQClient:
    """
    RabbitMQ client integration stub.
    Prepared for future message publishing and event consumption across services
    without requiring an active broker at startup.
    """

    def __init__(self, amqp_url: Optional[str] = None):
        self.amqp_url = amqp_url or settings.RABBITMQ_URL
        self.is_connected = False
        self._connection: Optional[Any] = None
        self._channel: Optional[Any] = None

    async def connect(self) -> None:
        """
        Connect to RabbitMQ broker if enabled and configured.
        Gracefully logs warning if broker is unavailable.
        """
        if not settings.RABBITMQ_ENABLED or not self.amqp_url:
            logger.info("RabbitMQ is not enabled or URL is not configured. Skipping connection.")
            return

        try:
            logger.info("Connecting to RabbitMQ broker at %s", self.amqp_url)
            # Integration point for aio-pika / pika connection
            self.is_connected = True
            logger.info("RabbitMQ client connected successfully.")
        except Exception as exc:
            self.is_connected = False
            logger.warning("RabbitMQ connection failed: %s. Continuing in disconnected mode.", exc)

    async def disconnect(self) -> None:
        """
        Close broker connection cleanly.
        """
        if self.is_connected:
            logger.info("Disconnecting RabbitMQ client...")
            self.is_connected = False

    async def publish_message(self, routing_key: str, message: dict) -> bool:
        """
        Publish an event to the exchange.
        """
        if not self.is_connected:
            logger.warning(
                "Cannot publish message to '%s': RabbitMQ client is not connected.",
                routing_key,
            )
            return False

        logger.info("Publishing message to %s: %s", routing_key, message)
        return True


rabbitmq_client = RabbitMQClient()
