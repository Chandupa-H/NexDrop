"""
NexDrop AI Delivery Assistant & MCP API Endpoints
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_optional_db
from app.modules.ai.schemas import ChatRequest, ChatResponse
from app.modules.ai.service import AIAssistantService
from app.modules.ai.mcp import handle_mcp_request, MCP_TOOLS_MANIFEST

router = APIRouter(prefix="/ai", tags=["AI Delivery Assistant & MCP"])


def get_ai_service(session: Optional[AsyncSession] = Depends(get_optional_db)) -> AIAssistantService:
    return AIAssistantService(session=session)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    payload: ChatRequest,
    service: AIAssistantService = Depends(get_ai_service),
) -> ChatResponse:
    """
    Chat with the NexDrop AI Delivery Assistant.
    Can answer queries like 'Where is my parcel NXD001225?' or 'How much to send 2 kg to Kandy?'
    by calling backend logistics APIs.
    """
    return await service.handle_chat(message=payload.message, history=payload.history)


@router.post("/mcp")
async def mcp_endpoint(
    request: Request,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> Dict[str, Any]:
    """
    Model Context Protocol (MCP) JSON-RPC 2.0 endpoint.
    Exposes 'tools/list' and 'tools/call' for seamless integration with external AI clients.
    """
    body = await request.json()
    return await handle_mcp_request(body, session=session)


@router.get("/tools")
async def list_ai_tools() -> Dict[str, Any]:
    """
    List all logistics tools exposed to the AI Delivery Assistant and MCP clients.
    """
    return {
        "count": len(MCP_TOOLS_MANIFEST),
        "protocol": "Model Context Protocol (MCP) v1.0",
        "tools": MCP_TOOLS_MANIFEST,
    }
