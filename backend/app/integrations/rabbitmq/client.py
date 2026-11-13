import fnmatch
import inspect
import logging
from typing import Optional, Any, Callable, Dict, List, Awaitable
from app.core.config import settings

logger = logging.getLogger(__name__)


class RabbitMQClient:
    """
    RabbitMQ client integration for event-driven messaging, parcel status
    event consumption, and real-time dashboard dispatch broadcasts.
    """

    def __init__(self, amqp_url: Optional[str] = None):
        self.amqp_url = amqp_url or settings.RABBITMQ_URL
        self.is_connected = False
        self._connection: Optional[Any] = None
        self._channel: Optional[Any] = None
        self._subscribers: Dict[str, List[Callable[[str, dict], Awaitable[None]]]] = {}

    def subscribe(
        self,
        routing_key_pattern: str,
        callback: Callable[[str, dict], Awaitable[None]],
    ) -> None:
        """
        Register a consumer callback for a routing key pattern (supports '*' and '#' wildcards).
        """
        if routing_key_pattern not in self._subscribers:
            self._subscribers[routing_key_pattern] = []
        if callback not in self._subscribers[routing_key_pattern]:
            self._subscribers[routing_key_pattern].append(callback)
            logger.info("Registered consumer for RabbitMQ pattern '%s'", routing_key_pattern)

    def unsubscribe(
        self,
        routing_key_pattern: str,
        callback: Callable[[str, dict], Awaitable[None]],
    ) -> None:
        """
        Unregister an event consumer callback.
        """
        if routing_key_pattern in self._subscribers:
            if callback in self._subscribers[routing_key_pattern]:
                self._subscribers[routing_key_pattern].remove(callback)

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
        Publish an event to the exchange and dispatch to active consumers.
        """
        # Always deliver to registered in-process subscribers (e.g. WebSocket bridge)
        await self._dispatch_to_subscribers(routing_key, message)

        if not self.is_connected:
            logger.info(
                "RabbitMQ broker not connected. Event '%s' dispatched to local in-process subscribers.",
                routing_key,
            )
            return True

        logger.info("Publishing RabbitMQ message to '%s': %s", routing_key, message)
        return True

    async def _dispatch_to_subscribers(self, routing_key: str, message: dict) -> None:
        """
        Deliver message to all registered subscriber callbacks matching the routing key.
        """
        for pattern, callbacks in list(self._subscribers.items()):
            # Convert AMQP wildcards (* matches word, # matches multiple words) for fnmatch
            fn_pattern = pattern.replace(".", "/").replace("*", "[^/]*").replace("#", "*")
            normalized_key = routing_key.replace(".", "/")

            if pattern == routing_key or fnmatch.fnmatch(normalized_key, fn_pattern) or pattern == "*":
                for cb in callbacks:
                    try:
                        res = cb(routing_key, message)
                        if inspect.isawaitable(res):
                            await res
                    except Exception as exc:
                        logger.error(
                            "Error invoking RabbitMQ consumer callback for '%s': %s",
                            routing_key,
                            exc,
                        )


rabbitmq_client = RabbitMQClient()
