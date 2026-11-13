"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface RealtimeDeliveryEvent {
  type: string;
  event: string;
  data?: any;
  timestamp: string;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseDispatcherRealtimeOptions {
  channel?: string;
  onEvent?: (event: RealtimeDeliveryEvent) => void;
  enabled?: boolean;
}

export function useDispatcherRealtime({
  channel = "dispatcher",
  onEvent,
  enabled = true,
}: UseDispatcherRealtimeOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<RealtimeDeliveryEvent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const getWsUrl = useCallback(() => {
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return `${process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "")}/ws/${channel}`;
    }

    if (typeof window !== "undefined") {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        try {
          const parsed = new URL(apiUrl);
          const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
          return `${protocol}//${parsed.host}/ws/${channel}`;
        } catch {
          // fallback below
        }
      }
      const host = window.location.hostname || "127.0.0.1";
      return `ws://${host}:8000/ws/${channel}`;
    }

    return `ws://127.0.0.1:8000/ws/${channel}`;
  }, [channel]);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus("connecting");
    const wsUrl = getWsUrl();

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeDeliveryEvent;
          // Filter for active delivery updates and dispatch events
          if (parsed && (parsed.type === "ACTIVE_DELIVERY_UPDATE" || parsed.event)) {
            setLastEvent(parsed);
            setLastUpdated(new Date());
            onEventRef.current?.(parsed);
          }
        } catch {
          // Non-JSON message or ping
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        socketRef.current = null;

        // Auto-reconnect with exponential backoff (1s, 2s, 4s, up to 10s max)
        if (enabled) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch {
      setStatus("error");
    }
  }, [enabled, getWsUrl]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    lastEvent,
    lastUpdated,
    reconnect: connect,
  };
}

