import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ai_chat_track_parcel(async_client: AsyncClient):
    """Test AI assistant answers 'Where is my parcel NXD001225?'"""
    res = await async_client.post(
        "/api/v1/ai/chat",
        json={"message": "Where is my parcel NXD001225?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "NXD001225" in data["reply"]
    assert data["tool_used"] == "track_parcel"
    assert data["data"]["found"] is True
    assert data["data"]["status"] == "in_transit"


@pytest.mark.asyncio
async def test_ai_chat_calculate_shipping_rate(async_client: AsyncClient):
    """Test AI assistant answers 'How much to send 2 kg to Kandy?'"""
    res = await async_client.post(
        "/api/v1/ai/chat",
        json={"message": "How much to send 2 kg to Kandy?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "Kandy" in data["reply"]
    assert data["tool_used"] == "calculate_shipping_rate"
    assert data["data"]["destination"] == "Kandy"
    assert data["data"]["weight_kg"] == 2.0
    assert data["data"]["total_price"] > 0
    assert "Rs." in data["reply"]


@pytest.mark.asyncio
async def test_ai_tools_list_endpoint(async_client: AsyncClient):
    """Test GET /api/v1/ai/tools returns MCP tools"""
    res = await async_client.get("/api/v1/ai/tools")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 3
    tool_names = [t["name"] for t in data["tools"]]
    assert "track_parcel" in tool_names
    assert "calculate_shipping_rate" in tool_names
    assert "get_delivery_zones" in tool_names


@pytest.mark.asyncio
async def test_mcp_jsonrpc_tools_list(async_client: AsyncClient):
    """Test standard MCP JSON-RPC 2.0 tools/list"""
    res = await async_client.post(
        "/api/v1/ai/mcp",
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == 1
    assert "tools" in data["result"]
    tools = data["result"]["tools"]
    assert any(t["name"] == "calculate_shipping_rate" for t in tools)


@pytest.mark.asyncio
async def test_mcp_jsonrpc_tools_call(async_client: AsyncClient):
    """Test standard MCP JSON-RPC 2.0 tools/call"""
    res = await async_client.post(
        "/api/v1/ai/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "calculate_shipping_rate",
                "arguments": {"weight_kg": 2.0, "destination": "Kandy"},
            },
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 2
    assert "result" in data
    assert data["result"]["isError"] is False
    assert len(data["result"]["content"]) > 0
    assert "Kandy" in data["result"]["content"][0]["text"]
