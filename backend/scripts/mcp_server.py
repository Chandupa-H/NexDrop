"""
NexDrop MCP (Model Context Protocol) Stdio Server
Run this script to connect NexDrop delivery tools directly to any MCP client
(e.g., Claude Desktop, Antigravity, Cursor, or autonomous LLM agents).

Usage:
  python backend/scripts/mcp_server.py
"""

import sys
import os
import json
import asyncio

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.modules.ai.mcp import handle_mcp_request


async def main():
    # Read JSON-RPC messages line by line from stdin
    loop = asyncio.get_running_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        text = line.decode("utf-8").strip()
        if not text:
            continue
        try:
            req = json.loads(text)
            res = await handle_mcp_request(req, session=None)
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {str(e)}"},
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(main())
