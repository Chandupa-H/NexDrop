"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCourierLocationWebSocketTicket,
  postCourierLocation,
} from "../api/courier.api";
import type {
  CourierLocationDTO,
  CourierLocationUpdateDTO,
} from "../api/courier.dto";

type TrackingStatus = "idle" | "requesting" | "tracking" | "error";
type SocketStatus = "disconnected" | "connecting" | "connected" | "error";
type CourierPosition = Omit<CourierLocationDTO, "courier_id"> & {
  courier_id?: number;
};

function isCourierLocation(value: unknown): value is CourierLocationDTO {
  if (typeof value !== "object" || value === null) return false;
  const location = value as Record<string, unknown>;
  return (
    typeof location.courier_id === "number" &&
    typeof location.lat === "number" &&
    typeof location.lng === "number" &&
    typeof location.updated_at === "string"
  );
}

function getLocationWebSocketUrl(ticket: string): string {
  const apiUrl = new URL(
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1",
    window.location.href
  );
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/courier/ws/location`;
  apiUrl.search = new URLSearchParams({ ticket }).toString();
  return apiUrl.toString();
}

export function useCourierLiveLocation() {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [socketStatus, setSocketStatus] =
    useState<SocketStatus>("disconnected");
  const [location, setLocation] = useState<CourierPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const trackingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<number | null>(null);
  const latestPositionRef = useRef<CourierLocationUpdateDTO | null>(null);
  const sendingRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectRef = useRef<(() => void) | null>(null);

  const sendLatestPosition = useCallback(async () => {
    const position = latestPositionRef.current;
    if (!position || sendingRef.current || !trackingRef.current) return;

    sendingRef.current = true;
    try {
      const response = await postCourierLocation(position);
      setSyncError(null);
      if (response.accepted) setLocation(response.location);
    } catch (requestError) {
      setSyncError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send your location to the server."
      );
    } finally {
      sendingRef.current = false;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!trackingRef.current || reconnectTimerRef.current !== null) return;
    const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
    reconnectAttemptsRef.current += 1;
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectRef.current?.();
    }, delay);
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (
      !trackingRef.current ||
      (socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING))
    ) {
      return;
    }

    setSocketStatus("connecting");
    try {
      const { ticket } = await createCourierLocationWebSocketTicket();
      if (!trackingRef.current) return;
      const socket = new WebSocket(getLocationWebSocketUrl(ticket));
      socketRef.current = socket;

      socket.onopen = () => {
        setSocketStatus("connected");
        reconnectAttemptsRef.current = 0;
      };
      socket.onmessage = (event) => {
        let message: unknown;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (
          typeof message === "object" &&
          message !== null &&
          "type" in message &&
          message.type === "courier.location.updated" &&
          "data" in message &&
          isCourierLocation(message.data)
        ) {
          setLocation(message.data);
        }
      };
      socket.onerror = () => setSocketStatus("error");
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        setSocketStatus("disconnected");
        scheduleReconnect();
      };
    } catch (requestError) {
      setSocketStatus("error");
      setSyncError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to live location updates."
      );
      scheduleReconnect();
    }
  }, [scheduleReconnect]);

  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current !== null) {
      window.clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    setTrackingStatus("idle");
    setSocketStatus("disconnected");
  }, []);

  const startTracking = useCallback(() => {
    if (trackingRef.current) return;
    if (!("geolocation" in navigator)) {
      setError("This browser does not support device location.");
      setTrackingStatus("error");
      return;
    }

    setError(null);
    setSyncError(null);
    setTrackingStatus("requesting");
    trackingRef.current = true;
    void connectWebSocket();

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const nextPosition: CourierLocationUpdateDTO = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
          };
          latestPositionRef.current = nextPosition;
          setLocation({
            ...nextPosition,
            accuracy: nextPosition.accuracy ?? null,
            heading: nextPosition.heading ?? null,
            speed: nextPosition.speed ?? null,
            updated_at: new Date(position.timestamp).toISOString(),
            active_delivery_id: null,
          });
          setTrackingStatus("tracking");
          setError(null);
          void sendLatestPosition();
        },
        (positionError) => {
          stopTracking();
          setTrackingStatus("error");
          setError(
            positionError.code === positionError.PERMISSION_DENIED
              ? "Location permission was denied. Allow location access in your browser to share your position."
              : positionError.message ||
                  "Your device location is currently unavailable."
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );
      updateIntervalRef.current = window.setInterval(
        () => void sendLatestPosition(),
        10000
      );
    } catch (trackingError) {
      stopTracking();
      setTrackingStatus("error");
      setError(
        trackingError instanceof Error
          ? trackingError.message
          : "Unable to start device location tracking."
      );
    }
  }, [connectWebSocket, sendLatestPosition, stopTracking]);

  useEffect(() => {
    reconnectRef.current = () => void connectWebSocket();
    return () => {
      trackingRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current !== null) {
        window.clearInterval(updateIntervalRef.current);
      }
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [connectWebSocket]);

  return {
    trackingStatus,
    socketStatus,
    location,
    error,
    syncError,
    startTracking,
    stopTracking,
  };
}
