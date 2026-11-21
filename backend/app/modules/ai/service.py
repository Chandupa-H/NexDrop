"""
NexDrop AI Assistant Service
Orchestrates Generative AI function calling using Google Gemini API (when configured),
with an integrated natural language semantic parser for 100% offline reliability.
"""

import json
import re
import logging
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.ai.schemas import ChatMessage, ChatResponse
from app.modules.ai.tools import (
    track_parcel_tool,
    calculate_shipping_rate_tool,
    get_delivery_zones_tool,
)

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_PROMPT = """You are the NexDrop AI Delivery Assistant, an intelligent, helpful courier and logistics assistant for NexDrop Courier & Logistics in Sri Lanka.
You have real-time access to NexDrop backend systems via tools.
Use tools whenever a user asks about parcel status, tracking numbers, shipping costs, delivery rates, or delivery coverage.
Format prices in Sri Lankan Rupees (Rs. / LKR).
Be concise, polite, and accurate."""


def _get_groq_credentials() -> tuple[Optional[str], str]:
    api_key = settings.GROQ_API_KEY
    model = settings.GROQ_MODEL or "openai/gpt-oss-20b"
    if not api_key:
        try:
            from dotenv import dotenv_values, find_dotenv
            env = dotenv_values(".env") or dotenv_values("../.env") or dotenv_values(find_dotenv())
            api_key = env.get("GROQ_API_KEY")
            if env.get("GROQ_MODEL"):
                model = env.get("GROQ_MODEL")
        except Exception:
            pass
    return api_key, model


class AIAssistantService:
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def handle_chat(self, message: str, history: Optional[List[ChatMessage]] = None) -> ChatResponse:
        """
        Main entry point for handling user queries.
        Attempts Groq or Gemini LLM with tool calling if an API key is present;
        otherwise uses the intelligent logistics semantic router.
        """
        clean_msg = message.strip()

        # 1. If Groq API Key is configured, attempt Groq LLM tool calling first
        groq_key, groq_model = _get_groq_credentials()
        if groq_key:
            try:
                response = await self._call_groq_with_tools(clean_msg, history or [], groq_key=groq_key, groq_model=groq_model)
                if response:
                    return response
            except Exception as e:
                logger.warning(f"Groq API invocation failed: {e}. Checking secondary providers.")

        # 2. If Gemini API Key is configured, attempt Gemini tool calling
        if settings.GEMINI_API_KEY:
            try:
                response = await self._call_gemini_with_tools(clean_msg, history or [])
                if response:
                    return response
            except Exception as e:
                logger.warning(f"Gemini API invocation failed or timed out: {e}. Falling back to rule-based engine.")

        # 3. Reliable semantic engine
        return await self._execute_semantic_router(clean_msg)

    async def _call_groq_with_tools(
        self,
        message: str,
        history: List[ChatMessage],
        groq_key: Optional[str] = None,
        groq_model: Optional[str] = None,
    ) -> Optional[ChatResponse]:
        """
        Calls Groq OpenAI-compatible API with native tool/function calling.
        """
        active_key = groq_key or settings.GROQ_API_KEY
        active_model = groq_model or settings.GROQ_MODEL or "openai/gpt-oss-20b"
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "track_parcel",
                    "description": "Look up parcel delivery status and tracking events by tracking number (e.g. NXD001225).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tracking_number": {
                                "type": "string",
                                "description": "The tracking ID of the parcel, e.g. NXD001225",
                            }
                        },
                        "required": ["tracking_number"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate_shipping_rate",
                    "description": "Calculate shipping price estimate based on weight in kg, destination city in Sri Lanka, and optional tier.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "weight_kg": {"type": "number", "description": "Weight of the parcel in kilograms."},
                            "destination": {"type": "string", "description": "Destination city name in Sri Lanka (e.g. Kandy, Galle, Jaffna)."},
                            "tier": {"type": "string", "enum": ["Standard", "Express", "SameDay"]},
                        },
                        "required": ["weight_kg", "destination"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_delivery_zones",
                    "description": "Get coverage zones, hubs, and estimated transit times across Sri Lanka.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "city": {"type": "string", "description": "Optional city name to look up specific zone details."}
                        },
                    },
                },
            },
        ]

        messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in history[-4:]:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": message})

        headers = {
            "Authorization": f"Bearer {active_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": active_model,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Groq API returned status {resp.status_code}: {resp.text}")
                return None

            data = resp.json()
            choice = data.get("choices", [{}])[0]
            choice_msg = choice.get("message", {})

            tool_calls = choice_msg.get("tool_calls")
            if tool_calls:
                first_tool = tool_calls[0]
                fn_name = first_tool.get("function", {}).get("name")
                raw_args = first_tool.get("function", {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(raw_args)
                except Exception:
                    fn_args = {}

                tool_result = {}
                if fn_name == "track_parcel":
                    tool_result = await track_parcel_tool(
                        tracking_number=str(fn_args.get("tracking_number", "")),
                        session=self.session,
                    )
                elif fn_name == "calculate_shipping_rate":
                    tool_result = await calculate_shipping_rate_tool(
                        weight_kg=float(fn_args.get("weight_kg", 1.0)),
                        destination=str(fn_args.get("destination", "Colombo")),
                        tier=str(fn_args.get("tier", "Standard")),
                        session=self.session,
                    )
                elif fn_name == "get_delivery_zones":
                    tool_result = await get_delivery_zones_tool(
                        city=fn_args.get("city"),
                        session=self.session,
                    )

                # Append assistant tool_calls message and tool execution result
                followup_messages = list(messages)
                followup_messages.append(choice_msg)
                followup_messages.append({
                    "role": "tool",
                    "tool_call_id": first_tool.get("id"),
                    "name": fn_name,
                    "content": json.dumps(tool_result),
                })

                followup_payload = {
                    "model": active_model,
                    "messages": followup_messages,
                    "temperature": 0.2,
                }

                followup_resp = await client.post(GROQ_API_URL, headers=headers, json=followup_payload)
                if followup_resp.status_code == 200:
                    followup_data = followup_resp.json()
                    final_text = followup_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if final_text:
                        return ChatResponse(
                            reply=final_text.strip(),
                            tool_used=fn_name,
                            data=tool_result,
                            model=f"groq:{active_model}",
                        )

                return ChatResponse(
                    reply=f"Processed tool `{fn_name}` successfully.",
                    tool_used=fn_name,
                    data=tool_result,
                    model=f"groq:{active_model}",
                )

            content = choice_msg.get("content")
            if content:
                return ChatResponse(
                    reply=content.strip(),
                    tool_used=None,
                    model=f"groq:{active_model}",
                )

        return None

    async def _execute_semantic_router(self, message: str) -> ChatResponse:
        """
        High-precision intent classifier and tool executor.
        Ensures that queries like 'Where is my parcel NXD001225?' and
        'How much to send 2 kg to Kandy?' work seamlessly out-of-the-box.
        """
        msg_lower = message.lower()

        # 1. Parcel tracking intent
        nxd_match = re.search(r"(NXD\d{4,8})", message, re.IGNORECASE)
        track_keywords = ["where", "track", "parcel", "package", "status", "order", "delivery"]
        if nxd_match or any(k in msg_lower for k in ["where is", "track parcel", "track my"]):
            tracking_id = nxd_match.group(1).upper() if nxd_match else "NXD001225"
            tool_data = await track_parcel_tool(tracking_id, self.session)

            if tool_data.get("found"):
                status_label = tool_data.get("status_label", tool_data.get("status", "Unknown"))
                recipient = tool_data.get("recipient_name", "Customer")
                city = tool_data.get("delivery_city", "Sri Lanka")
                courier = tool_data.get("courier_name", "NexDrop Dispatch")
                eta = tool_data.get("estimated_delivery", "In transit")
                location = tool_data.get("current_location", city)

                reply = (
                    f"📦 **Parcel #{tracking_id} Status: {status_label}**\n\n"
                    f"• **Recipient**: {recipient}\n"
                    f"• **Destination**: {city}\n"
                    f"• **Current Location**: {location}\n"
                    f"• **Assigned Courier**: {courier}\n"
                    f"• **Estimated Delivery**: {eta}\n\n"
                    f"Need anything else regarding this delivery?"
                )
            else:
                reply = (
                    f"🔍 I couldn't find any parcel matching tracking code **{tracking_id}**.\n\n"
                    f"Please double check the code. Example format: `NXD001225` or `NXD001246`."
                )

            return ChatResponse(
                reply=reply,
                tool_used="track_parcel",
                data=tool_data,
                model="nexdrop-rule-engine",
            )

        # 2. Shipping cost / rate estimation intent
        # Examples: "How much to send 2 kg to Kandy?", "Cost for 5kg to Galle", "Estimate rate for 1.5kg to Colombo"
        rate_keywords = ["how much", "cost", "price", "rate", "estimate", "fee", "send", "ship", "quote"]
        if any(k in msg_lower for k in rate_keywords):
            # Extract weight in kg
            weight = 1.0
            weight_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)", msg_lower)
            if weight_match:
                weight = float(weight_match.group(1))
            else:
                num_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:to|in|for)", msg_lower)
                if num_match:
                    weight = float(num_match.group(1))

            # Extract destination city
            dest = "Colombo"
            cities = ["kandy", "galle", "matara", "jaffna", "negombo", "kurunegala", "anuradhapura", "trincomalee", "batticaloa", "nuwara eliya", "ratnapura", "kalutara", "gampaha", "badulla"]
            for c in cities:
                if c in msg_lower:
                    dest = c.title()
                    break

            # Check tier
            tier = "Standard"
            if "express" in msg_lower:
                tier = "Express"
            elif "same day" in msg_lower or "sameday" in msg_lower:
                tier = "SameDay"

            tool_data = await calculate_shipping_rate_tool(
                weight_kg=weight,
                destination=dest,
                tier=tier,
                session=self.session,
            )

            total = tool_data["formatted_price"]
            dist = tool_data["distance_km"]
            b = tool_data["breakdown"]

            reply = (
                f"💰 **Shipping Estimate: {dest} ({weight} kg - {tier} Tier)**\n\n"
                f"• **Estimated Total**: **{total}**\n"
                f"• **Distance**: ~{dist} km from Colombo Central Hub\n"
                f"• **Base Fare**: Rs. {b['base_fare']:,.2f} (covers first 2 km)\n"
                f"• **Distance Fee**: Rs. {b['distance_cost']:,.2f}\n"
                f"• **Weight Fee**: Rs. {b['weight_cost']:,.2f}\n"
                f"• **Estimated Transit Time**: {tool_data['estimated_delivery_time']}\n\n"
                f"💡 *Rates reflect current platform pricing and fuel indices.*"
            )

            return ChatResponse(
                reply=reply,
                tool_used="calculate_shipping_rate",
                data=tool_data,
                model="nexdrop-rule-engine",
            )

        # 3. Delivery zones & coverage intent
        if any(k in msg_lower for k in ["zone", "coverage", "deliver to", "islandwide", "areas"]):
            city_query = None
            for c in ["kandy", "galle", "jaffna", "colombo", "negombo", "matara", "kurunegala"]:
                if c in msg_lower:
                    city_query = c
                    break

            tool_data = await get_delivery_zones_tool(city_query, self.session)
            if city_query:
                z = tool_data["zone"]
                reply = (
                    f"📍 **Delivery Coverage for {city_query.title()}**\n\n"
                    f"Yes! We deliver to **{city_query.title()}** under **{z['name']}**.\n"
                    f"• **Hub**: {z.get('hub', 'Regional Center')}\n"
                    f"• **Base Rate**: Rs. {z.get('base_fee', 350.0):,.2f}\n"
                    f"• **Estimated Transit**: {z.get('time', '24-48 hours')}"
                )
            else:
                reply = (
                    f"📍 **NexDrop Delivery Coverage**\n\n"
                    f"We provide islandwide delivery across all 9 provinces in Sri Lanka! Our main distribution hubs include:\n\n"
                    f"• **Western Hub**: Colombo, Gampaha, Negombo, Kalutara (24h delivery)\n"
                    f"• **Central Hub**: Kandy, Peradeniya, Nuwara Eliya\n"
                    f"• **Southern Hub**: Galle, Matara, Hambantota\n"
                    f"• **Northern Hub**: Jaffna, Kilinochchi, Vavuniya\n"
                    f"• **Eastern Hub**: Trincomalee, Batticaloa\n\n"
                    f"Ask me for a rate estimate to any specific city!"
                )

            return ChatResponse(
                reply=reply,
                tool_used="get_delivery_zones",
                data=tool_data,
                model="nexdrop-rule-engine",
            )

        # 4. Default helpful guidance
        reply = (
            "👋 Hello! I am your **NexDrop AI Delivery Assistant**.\n\n"
            "Here are some examples of what you can ask me:\n"
            "• 📦 *'Where is my parcel NXD001225?'*\n"
            "• 💰 *'How much to send 2 kg to Kandy?'*\n"
            "• 📍 *'Do you deliver to Galle and what is the rate?'*\n"
            "• ⚡ *'What is the express shipping fee for 5 kg to Jaffna?'*\n\n"
            "How can I help you today?"
        )
        return ChatResponse(
            reply=reply,
            tool_used=None,
            model="nexdrop-rule-engine",
        )

    async def _call_gemini_with_tools(self, message: str, history: List[ChatMessage]) -> Optional[ChatResponse]:
        """
        Calls Google Gemini API with native function declarations.
        """
        tools_declaration = [
            {
                "name": "track_parcel",
                "description": "Look up parcel delivery status and tracking events by tracking number (e.g. NXD001225).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "tracking_number": {
                            "type": "STRING",
                            "description": "The tracking ID of the parcel, e.g. NXD001225",
                        }
                    },
                    "required": ["tracking_number"],
                },
            },
            {
                "name": "calculate_shipping_rate",
                "description": "Calculate shipping price estimate based on weight in kg, destination city in Sri Lanka, and optional tier.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "weight_kg": {"type": "NUMBER", "description": "Weight of the parcel in kilograms."},
                        "destination": {"type": "STRING", "description": "Destination city name in Sri Lanka (e.g. Kandy, Galle, Jaffna)."},
                        "tier": {"type": "STRING", "description": "Shipping tier: Standard, Express, or SameDay.", "enum": ["Standard", "Express", "SameDay"]},
                    },
                    "required": ["weight_kg", "destination"],
                },
            },
            {
                "name": "get_delivery_zones",
                "description": "Get coverage zones, hubs, and estimated transit times across Sri Lanka.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "city": {"type": "STRING", "description": "Optional city name to look up specific zone details."}
                    },
                },
            },
        ]

        # Build contents array
        contents = []
        for h in history[-4:]:
            role = "user" if h.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h.content}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": contents,
            "tools": [{"functionDeclarations": tools_declaration}],
        }

        url = GEMINI_API_URL.format(model=settings.AI_MODEL) + f"?key={settings.GEMINI_API_KEY}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
                return None

            data = resp.json()
            candidate = data.get("candidates", [{}])[0]
            parts = candidate.get("content", {}).get("parts", [])

            # Check if Gemini returned a function call
            for part in parts:
                if "functionCall" in part:
                    fn_call = part["functionCall"]
                    fn_name = fn_call.get("name")
                    fn_args = fn_call.get("args", {})

                    tool_result = {}
                    if fn_name == "track_parcel":
                        tool_result = await track_parcel_tool(
                            tracking_number=str(fn_args.get("tracking_number", "")),
                            session=self.session,
                        )
                    elif fn_name == "calculate_shipping_rate":
                        tool_result = await calculate_shipping_rate_tool(
                            weight_kg=float(fn_args.get("weight_kg", 1.0)),
                            destination=str(fn_args.get("destination", "Colombo")),
                            tier=str(fn_args.get("tier", "Standard")),
                            session=self.session,
                        )
                    elif fn_name == "get_delivery_zones":
                        tool_result = await get_delivery_zones_tool(
                            city=fn_args.get("city"),
                            session=self.session,
                        )

                    # Now send functionResponse back to Gemini for natural final answer
                    followup_contents = list(contents)
                    followup_contents.append({"role": "model", "parts": [part]})
                    followup_contents.append({
                        "role": "function",
                        "parts": [{
                            "functionResponse": {
                                "name": fn_name,
                                "response": tool_result,
                            }
                        }],
                    })

                    followup_payload = {
                        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                        "contents": followup_contents,
                    }

                    followup_resp = await client.post(url, json=followup_payload)
                    if followup_resp.status_code == 200:
                        followup_data = followup_resp.json()
                        final_text = followup_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if final_text:
                            return ChatResponse(
                                reply=final_text.strip(),
                                tool_used=fn_name,
                                data=tool_result,
                                model=f"gemini:{settings.AI_MODEL}",
                            )

                    # Fallback text if follow-up failed
                    return ChatResponse(
                        reply=f"Processed tool `{fn_name}` successfully.",
                        tool_used=fn_name,
                        data=tool_result,
                        model=f"gemini:{settings.AI_MODEL}",
                    )

            # Normal text response without tool call
            for part in parts:
                if "text" in part:
                    return ChatResponse(
                        reply=part["text"].strip(),
                        tool_used=None,
                        model=f"gemini:{settings.AI_MODEL}",
                    )

        return None
