import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    WebSocket connection manager for real-time tracking,
    courier location updates, and live dispatch notifications.
    """

    def __init__(self):
        # Maps channel/room ID to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel_id: str = "global") -> None:
        """
        Accept connection and register into channel.
        """
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
        logger.info("WebSocket connected to channel: %s", channel_id)

    def disconnect(self, websocket: WebSocket, channel_id: str = "global") -> None:
        """
        Unregister connection on disconnect.
        """
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
        logger.info("WebSocket disconnected from channel: %s", channel_id)

    async def broadcast_to_channel(self, channel_id: str, message: Any) -> None:
        """
        Broadcast JSON message to all subscribers of a specific channel.
        """
        if channel_id in self.active_connections:
            for connection in self.active_connections[channel_id]:
                try:
                    await connection.send_json(message)
                except Exception as exc:
                    logger.warning("Error sending message to websocket client: %s", exc)


ws_manager = ConnectionManager()
