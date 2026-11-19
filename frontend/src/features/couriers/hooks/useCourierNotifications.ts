"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * WebSocket hook for the courier's personal notification channel.
 * Connects to /api/v1/couriers/courier/ws and calls onParcelStatusChanged
 * whenever a PARCEL_STATUS_CHANGED message arrives.
 *
 * The backend broadcasts to channel `courier_{id}` after every status mutation:
 *   - update_parcel_status
 *   - submit_successful_delivery
 *   - submit_failed_delivery
 */

function getCourierWsUrl(): string {
  const apiUrl = new URL(
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1",
    typeof window !== "undefined" ? window.location.href : "http://localhost"
  );
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/couriers/courier/ws`;
  return apiUrl.toString();
}

interface CourierNotificationPayload {
  tracking_id: string;
  parcel_id: number;
  courier_id: number;
  new_status: string;
  timestamp: string;
}

interface UseCourierNotificationsOptions {
  /** Called when any parcel status changes for this courier. */
  onParcelStatusChanged?: (payload: CourierNotificationPayload) => void;
  /** Whether the hook should connect (e.g. only when courier is logged in). */
  enabled?: boolean;
}

export function useCourierNotifications({
  onParcelStatusChanged,
  enabled = true,
}: UseCourierNotificationsOptions = {}) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    )
      return;

    const token =
      typeof window !== "undefined"
        ? (localStorage.getItem("access_token") ??
          document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1])
        : undefined;

    const url = getCourierWsUrl();
    const socket = new WebSocket(
      token ? `${url}?token=${encodeURIComponent(token)}` : url
    );
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type?: string;
          data?: CourierNotificationPayload;
        };
        if (msg.type === "PARCEL_STATUS_CHANGED" && msg.data) {
          onParcelStatusChanged?.(msg.data);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      if (!isMountedRef.current) return;
      socketRef.current = null;
      // Exponential back-off: max 16 s
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 16000);
      reconnectAttemptsRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [enabled, onParcelStatusChanged]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, connect]);
}
