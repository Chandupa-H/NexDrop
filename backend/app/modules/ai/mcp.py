"""
Model Context Protocol (MCP) Standard Server Implementation for NexDrop
Enables external AI clients, Claude Desktop, Antigravity, and autonomous agents
to discover and execute NexDrop logistics tools via standard JSON-RPC 2.0.
"""

import json
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.tools import (
    track_parcel_tool,
    calculate_shipping_rate_tool,
    get_delivery_zones_tool,
)

MCP_TOOLS_MANIFEST = [
    {
        "name": "track_parcel",
        "description": "Look up parcel delivery status, location, courier details, and timeline events by tracking number (e.g. NXD001225).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "tracking_number": {
                    "type": "string",
                    "description": "The tracking code of the parcel (e.g. 'NXD001225', 'NXD001246').",
                }
            },
            "required": ["tracking_number"],
        },
    },
    {
        "name": "calculate_shipping_rate",
        "description": "Calculate instant shipping price estimate in Sri Lankan Rupees (Rs. / LKR) based on parcel weight (kg), destination city, and service tier.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "weight_kg": {
                    "type": "number",
                    "description": "Weight of the parcel in kilograms (e.g. 2.0).",
                },
                "destination": {
                    "type": "string",
                    "description": "Destination city name in Sri Lanka (e.g. 'Kandy', 'Galle', 'Jaffna', 'Colombo').",
                },
                "tier": {
                    "type": "string",
                    "description": "Delivery tier (optional): 'Standard', 'Express', or 'SameDay'. Default is 'Standard'.",
                    "enum": ["Standard", "Express", "SameDay"],
                },
            },
            "required": ["weight_kg", "destination"],
        },
    },
    {
        "name": "get_delivery_zones",
        "description": "Retrieve active delivery coverage zones, central hubs, and transit times across Sri Lanka.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "Optional city name to verify specific coverage and hub information.",
                }
            },
        },
    },
]


async def handle_mcp_request(
    body: Dict[str, Any],
    session: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Handles standard JSON-RPC 2.0 MCP requests.
    Supports:
      - 'tools/list': Returns available MCP tools.
      - 'tools/call': Executes an MCP tool and returns the response.
    """
    req_id = body.get("id")
    method = body.get("method")
    params = body.get("params", {})

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS_MANIFEST,
            },
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})

        if not tool_name:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": "Missing required parameter 'name' in tools/call"},
            }

        try:
            if tool_name == "track_parcel":
                tracking_number = str(args.get("tracking_number", ""))
                res = await track_parcel_tool(tracking_number, session=session)
            elif tool_name == "calculate_shipping_rate":
                weight = float(args.get("weight_kg", 1.0))
                destination = str(args.get("destination", "Colombo"))
                tier = str(args.get("tier", "Standard"))
                res = await calculate_shipping_rate_tool(weight, destination, tier, session=session)
            elif tool_name == "get_delivery_zones":
                city = args.get("city")
                res = await get_delivery_zones_tool(city=city, session=session)
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method or tool '{tool_name}' not found"},
                }

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(res, indent=2, default=str),
                        }
                    ],
                    "isError": False,
                },
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": f"Execution error: {str(e)}"},
            }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown MCP method '{method}'. Supported: 'tools/list', 'tools/call'"},
        }
