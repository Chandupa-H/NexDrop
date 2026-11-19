"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Package,
  Calculator,
  MapPin,
  Bot,
  User,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolUsed?: string | null;
  data?: Record<string, any> | null;
  model?: string;
  timestamp: string;
}

const INITIAL_MESSAGE: Message = {
  id: "init-1",
  role: "assistant",
  content:
    "Hello! I'm your **NexDrop AI Delivery Assistant**.\n\nI can track live parcels or calculate instant shipping estimates for any destination in Sri Lanka. How can I help you today?",
  timestamp: "Just now",
};

const SUGGESTED_CHIPS = [
  { label: "📦 Where is NXD001225?", query: "Where is my parcel NXD001225?" },
  { label: "💰 2 kg to Kandy", query: "How much to send 2 kg to Kandy?" },
  { label: "📍 Do you deliver to Galle?", query: "Do you deliver to Galle and what is the base rate?" },
  { label: "⚡ Express to Jaffna", query: "How much for 3 kg express to Jaffna?" },
];

function formatMessageContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    // Split by **bold** first, then *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={pIdx} className="italic text-emerald-950 font-medium">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });

    return (
      <span key={idx}>
        {formattedParts}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function DeliveryAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await apiClient.sendAiChat(query, history);

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        toolUsed: res.tool_used,
        data: res.data,
        model: res.model,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I experienced a temporary connection glitch. Please check your backend connection or try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 rounded-full bg-[#064E3B] px-4 py-3 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-[#065F46] focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
            aria-label="Open NexDrop AI Delivery Assistant"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="text-left font-medium">
              <div className="text-xs uppercase tracking-wider text-emerald-200">AI Assistant</div>
              <div className="text-sm font-semibold">Delivery Bot</div>
            </div>
          </button>
        )}
      </div>

      {/* Slide-out / Pop-up Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[580px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#064E3B] px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Bot className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide">NexDrop Assistant</h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Powered by Generative AI & MCP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-emerald-200 transition hover:bg-white/10 hover:text-white"
                aria-label="Reset conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="rounded-lg p-1.5 text-emerald-200 transition hover:bg-white/10 hover:text-white"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F9FBFA]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#064E3B]">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`flex flex-col max-w-[82%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#064E3B] text-white rounded-br-xs"
                        : "bg-white text-gray-800 border border-gray-200/80 shadow-xs rounded-bl-xs"
                    }`}
                  >
                    {formatMessageContent(m.content)}

                    {/* Rich Parcel Tracking Card */}
                    {m.toolUsed === "track_parcel" && m.data?.found && (
                      <div className="mt-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-xs text-gray-700">
                        <div className="flex items-center justify-between font-semibold text-[#064E3B]">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {m.data.tracking_number}
                          </span>
                          <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] uppercase font-bold text-emerald-800">
                            {m.data.status_label || m.data.status}
                          </span>
                        </div>
                        {m.data.recipient_name && (
                          <div className="mt-1 text-gray-600">
                            Recipient: <span className="font-medium text-gray-800">{m.data.recipient_name}</span>
                          </div>
                        )}
                        {m.data.current_location && (
                          <div className="text-gray-600">
                            Location: <span className="font-medium text-gray-800">{m.data.current_location}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rich Shipping Estimate Card */}
                    {m.toolUsed === "calculate_shipping_rate" && m.data?.success && (
                      <div className="mt-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-xs text-gray-700">
                        <div className="flex items-center justify-between font-semibold text-[#064E3B]">
                          <span className="flex items-center gap-1">
                            <Calculator className="h-3.5 w-3.5" />
                            {m.data.destination} ({m.data.weight_kg} kg)
                          </span>
                          <span className="text-sm font-bold text-emerald-700">
                            {m.data.formatted_price}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Est. Distance: {m.data.distance_km} km</span>
                          <span>{m.data.estimated_delivery_time}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-gray-400">
                    <span>{m.timestamp}</span>
                    {m.model && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                          m.model.startsWith("groq")
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : m.model.startsWith("gemini")
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {m.model.startsWith("groq")
                          ? "⚡ Groq LLM"
                          : m.model.startsWith("gemini")
                          ? "✨ Gemini LLM"
                          : "🛡️ Fallback Engine"}
                      </span>
                    )}
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[#064E3B]">
                  <Bot className="h-3.5 w-3.5 animate-bounce" />
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200/70 px-3 py-1.5 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Checking backend APIs...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-gray-100 bg-white px-3 py-2 text-xs">
            {SUGGESTED_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleSend(chip.query)}
                className="whitespace-nowrap rounded-full border border-gray-200/90 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#064E3B]"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-gray-200 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask where your parcel is or get rates..."
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#064E3B] text-white transition hover:bg-[#065F46] disabled:opacity-40 disabled:hover:bg-[#064E3B]"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
