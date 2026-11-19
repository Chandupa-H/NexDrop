import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryTrackingDTO } from "../api/courier.dto";

const {
  getCourierTracking,
  updateCourierDeliveryStatus,
  postCourierLocation,
} = vi.hoisted(() => ({
  getCourierTracking: vi.fn(),
  updateCourierDeliveryStatus: vi.fn(),
  postCourierLocation: vi.fn(),
}));

vi.mock("../api/courier.api", () => ({
  getCourierTracking,
  updateCourierDeliveryStatus,
  postCourierLocation,
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
    location_source: delivered ? "unavailable" : "live",
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
  };
}

const oldGeolocation = Object.getOwnPropertyDescriptor(navigator, "geolocation");

describe("DeliveryDetailsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText("Location unavailable")).toBeInTheDocument();
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

  it("sends actual browser GPS coordinates to the backend", async () => {
    let reportPosition: PositionCallback | undefined;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: vi.fn((success: PositionCallback) => {
          reportPosition = success;
          return 23;
        }),
        clearWatch: vi.fn(),
      },
    });
    render(
      <DeliveryDetailsDialog
        deliveryId={1001}
        onClose={vi.fn()}
        onStatusUpdated={vi.fn()}
      />
    );
    await screen.findByText("Navigate to pickup location");
    await act(async () => {
      reportPosition?.({
        coords: {
          latitude: 6.955,
          longitude: 79.88,
          accuracy: 5,
          heading: 90,
          speed: 4,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    await waitFor(() => {
      expect(postCourierLocation).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 6.955, lng: 79.88, deliveryId: 1001 })
      );
    });
  });
});
