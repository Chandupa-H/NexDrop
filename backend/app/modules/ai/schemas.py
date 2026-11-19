from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User's query")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation history")


class ChatResponse(BaseModel):
    reply: str
    tool_used: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    model: str = "nexdrop-delivery-assistant"


# MCP Standard JSON-RPC schemas
class MCPToolParameter(BaseModel):
    type: str = "object"
    properties: Dict[str, Any]
    required: List[str] = Field(default_factory=list)


class MCPToolDefinition(BaseModel):
    name: str
    description: str
    inputSchema: MCPToolParameter


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[Dict[str, Any]] = None
