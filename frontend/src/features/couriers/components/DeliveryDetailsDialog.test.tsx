import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryTrackingDTO } from "../api/courier.dto";

const {
  getCourierTracking,
  updateCourierDeliveryStatus,
  postCourierLocation,
  isDevelopmentCourierMockEnabled,
} = vi.hoisted(() => ({
  getCourierTracking: vi.fn(),
  updateCourierDeliveryStatus: vi.fn(),
  postCourierLocation: vi.fn(),
  isDevelopmentCourierMockEnabled: vi.fn(),
}));

vi.mock("../api/courier.api", () => ({
  getCourierTracking,
  updateCourierDeliveryStatus,
  postCourierLocation,
  isDevelopmentCourierMockEnabled,
}));

vi.mock("./DeliveryMapPanel", () => ({
  DeliveryMapPanel: ({ tracking }: { tracking: DeliveryTrackingDTO }) => (
    <div data-testid="delivery-map">
      {tracking.next_destination?.address ?? "Completed"}
      {tracking.courier_location &&
        ` ${tracking.courier_location.lat},${tracking.courier_location.lng}`}
    </div>
  ),
}));

import { DeliveryDetailsDialog } from "./DeliveryDetailsDialog";

function trackingFixture(status: DeliveryTrackingDTO["delivery"]["status"]): DeliveryTrackingDTO {
  const pending = status === "pending";
  const delivered = status === "delivered";
  return {
    delivery: {
      parcel_id: 1001,
      tracking_number: "ND-2026-001",
      status,
      pickup_address: "18 Galle Road, Colombo 03",
      pickup_lat: 6.9147,
      pickup_lng: 79.8521,
      dropoff_address: "42 Nawala Road, Rajagiriya",
      dropoff_lat: 6.9094,
      dropoff_lng: 79.8933,
      size: "Medium",
      weight: 2.5,
      recipient_name: "Kasun Perera",
      recipient_phone: "0771234567",
      assigned_at: "2026-11-05T08:30:00+05:30",
      delivery_instructions: "Call on arrival",
    },
    courier_location: delivered
      ? null
      : {
          lat: 6.9344,
          lng: 79.8428,
          accuracy: 8,
          heading: null,
          speed: null,
          updated_at: "2026-11-05T08:30:00+05:30",
          active_delivery_id: 1001,
        },
    location_source: delivered ? "unavailable" : "simulated",
    next_destination: delivered
      ? null
      : pending
        ? {
            address: "18 Galle Road, Colombo 03",
            lat: 6.9147,
            lng: 79.8521,
          }
        : {
            address: "42 Nawala Road, Rajagiriya",
            lat: 6.9094,
            lng: 79.8933,
          },
    next_action: delivered
      ? "Delivery completed"
      : pending
        ? "Navigate to pickup location"
        : "Navigate to delivery location",
    simulation_route: delivered
      ? []
      : [
          { lat: 6.9344, lng: 79.8428 },
          { lat: 6.932, lng: 79.847 },
          { lat: 6.9147, lng: 79.8521 },
        ],
  };
}

const oldGeolocation = Object.getOwnPropertyDescriptor(navigator, "geolocation");

describe("DeliveryDetailsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDevelopmentCourierMockEnabled.mockReturnValue(true);
    getCourierTracking.mockResolvedValue(trackingFixture("pending"));
    updateCourierDeliveryStatus.mockResolvedValue({});
    postCourierLocation.mockResolvedValue({ accepted: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    if (oldGeolocation) {
      Object.defineProperty(navigator, "geolocation", oldGeolocation);
    } else {
      Reflect.deleteProperty(navigator, "geolocation");
    }
  });

  it("shows assigned delivery details and navigates to pickup", async () => {
    render(
      <DeliveryDetailsDialog
        deliveryId={1001}
        onClose={vi.fn()}
        onStatusUpdated={vi.fn()}
      />
    );

    expect(await screen.findByText("Navigate to pickup location")).toBeInTheDocument();
    expect(screen.getByText("Call on arrival")).toBeInTheDocument();
    expect(await screen.findByTestId("delivery-map")).toHaveTextContent(
      "18 Galle Road, Colombo 03"
    );
    expect(screen.getByText("Simulated GPS")).toBeInTheDocument();
  });

  it("switches the destination after marking the parcel picked up", async () => {
    getCourierTracking
      .mockResolvedValueOnce(trackingFixture("pending"))
      .mockResolvedValueOnce(trackingFixture("picked_up"));
    const onStatusUpdated = vi.fn();
    render(
      <DeliveryDetailsDialog
        deliveryId={1001}
        onClose={vi.fn()}
        onStatusUpdated={onStatusUpdated}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Mark as Picked Up" }));

    await waitFor(() => {
      expect(updateCourierDeliveryStatus).toHaveBeenCalledWith(1001, {
        status: "picked_up",
      });
    });
    expect(await screen.findByText("Navigate to delivery location")).toBeInTheDocument();
    expect(await screen.findByTestId("delivery-map")).toHaveTextContent(
      "42 Nawala Road, Rajagiriya"
    );
    expect(onStatusUpdated).toHaveBeenCalledOnce();
  });

  it("handles denied GPS permissions and clears the watcher when closed", async () => {
    isDevelopmentCourierMockEnabled.mockReturnValue(false);
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: vi.fn((_success, failure) => {
          queueMicrotask(() =>
            failure?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
          );
          return 22;
        }),
        clearWatch,
      },
    });
    const onClose = vi.fn();
    render(
      <DeliveryDetailsDialog
        deliveryId={1001}
        onClose={onClose}
        onStatusUpdated={vi.fn()}
      />
    );

    expect(await screen.findByText("Permission denied")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(clearWatch).toHaveBeenCalledWith(22);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves simulated GPS along the provided route and stops after unmount", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <DeliveryDetailsDialog
        deliveryId={1001}
        onClose={vi.fn()}
        onStatusUpdated={vi.fn()}
      />
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Navigate to pickup location")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(postCourierLocation).toHaveBeenCalledOnce();
    const simulatedPoint = postCourierLocation.mock.calls[0][0];
    expect(simulatedPoint.deliveryId).toBe(1001);
    expect(simulatedPoint.lat).toBeLessThan(6.9344);
    expect(simulatedPoint.lat).toBeGreaterThan(6.932);
    expect(simulatedPoint.lng).toBeGreaterThan(79.8428);

    unmount();
    const callsBeforeWait = postCourierLocation.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(postCourierLocation).toHaveBeenCalledTimes(callsBeforeWait);
  });
});
