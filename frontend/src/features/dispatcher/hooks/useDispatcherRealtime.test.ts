import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDispatcherRealtime } from "./useDispatcherRealtime";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }
}

describe("useDispatcherRealtime", () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    (global as any).WebSocket = originalWebSocket;
  });

  it("connects to the dispatcher WebSocket channel and tracks status", async () => {
    const { result } = renderHook(() => useDispatcherRealtime({ channel: "dispatcher" }));

    expect(result.current.status).toBe("connecting");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.status).toBe("connected");
  });

  it("handles incoming ACTIVE_DELIVERY_UPDATE events and triggers callback", async () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() =>
      useDispatcherRealtime({ channel: "dispatcher", onEvent })
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const activeSocket = MockWebSocket.instances[0];
    expect(activeSocket).toBeDefined();

    const mockEvent = {
      type: "ACTIVE_DELIVERY_UPDATE",
      event: "parcel.status.updated",
      data: { parcel_id: 1, status: "delivered" },
      timestamp: "2026-11-12T16:00:00Z",
    };

    act(() => {
      activeSocket.onmessage?.({ data: JSON.stringify(mockEvent) });
    });

    expect(onEvent).toHaveBeenCalledWith(mockEvent);
    expect(result.current.lastEvent).toEqual(mockEvent);
  });
});

