import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryTrackingDTO } from "../api/courier.dto";
import { DeliveryMapPanel } from "./DeliveryMapPanel";

const mapMocks = vi.hoisted(() => ({
  invalidateSize: vi.fn(),
  fitBounds: vi.fn(),
  setView: vi.fn(),
}));

vi.mock("react-leaflet", async () => {
  const React = await import("react");
  return {
    MapContainer: ({
      children,
      ...props
    }: PropsWithChildren<Record<string, unknown>>) =>
      React.createElement("div", { ...props, "data-testid": "map-container" }, children),
    TileLayer: (props: { url: string; attribution: string }) =>
      React.createElement("div", {
        "data-testid": "osm-tiles",
        "data-url": props.url,
        "data-attribution": props.attribution,
      }),
    Marker: ({
      children,
      position,
      title,
      icon,
    }: PropsWithChildren<{
      position: [number, number];
      title: string;
      icon: { options: { html: string } };
    }>) =>
      React.createElement(
        "div",
        {
          "data-testid": `marker-${title}`,
          "data-position": JSON.stringify(position),
          "data-icon": icon.options.html,
        },
        children
      ),
    Polyline: ({ positions }: { positions: [number, number][] }) =>
      React.createElement("div", {
        "data-testid": "route-polyline",
        "data-positions": JSON.stringify(positions),
      }),
    Tooltip: ({ children }: PropsWithChildren) =>
      React.createElement("span", null, children),
    useMap: () => ({
      invalidateSize: mapMocks.invalidateSize,
      fitBounds: mapMocks.fitBounds,
      setView: mapMocks.setView,
      getContainer: () => document.createElement("div"),
    }),
  };
});

function trackingFixture(
  status: DeliveryTrackingDTO["delivery"]["status"] = "pending",
  locationSource: DeliveryTrackingDTO["location_source"] = "live"
): DeliveryTrackingDTO {
  const destination = status === "pending"
    ? { address: "18 Galle Road, Colombo 03", lat: 6.9147, lng: 79.8521 }
    : { address: "42 Nawala Road, Rajagiriya", lat: 6.9094, lng: 79.8933 };
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
      delivery_instructions: null,
    },
    courier_location: {
      lat: 6.9344,
      lng: 79.8428,
      accuracy: 8,
      heading: null,
      speed: null,
      updated_at: "2026-11-05T08:30:00+05:30",
      active_delivery_id: 1001,
    },
    location_source: locationSource,
    next_destination: destination,
    next_action:
      status === "pending"
        ? "Navigate to pickup location"
        : "Navigate to delivery location",
    simulation_route:
      locationSource === "simulated"
        ? [
            { lat: 6.9344, lng: 79.8428 },
            { lat: 6.925, lng: 79.85 },
            { lat: destination.lat!, lng: destination.lng! },
          ]
        : undefined,
  };
}

function routeResponse(routes: Array<{
  distance: number;
  duration: number;
  coordinates: [number, number][];
}>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      code: "Ok",
      routes: routes.map((route) => ({
        distance: route.distance,
        duration: route.duration,
        geometry: { coordinates: route.coordinates },
      })),
    }),
  } as Response;
}

const primaryRoute = {
  distance: 8_000,
  duration: 1_200,
  coordinates: [
    [79.8428, 6.9344],
    [79.85, 6.925],
    [79.8521, 6.9147],
  ] as [number, number][],
};
const shortestRoute = {
  distance: 5_000,
  duration: 900,
  coordinates: [
    [79.8428, 6.9344],
    [79.848, 6.923],
    [79.8521, 6.9147],
  ] as [number, number][],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(routeResponse([primaryRoute, shortestRoute]));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DeliveryMapPanel", () => {
  it("renders a responsive OSM map with the selected delivery's three labeled markers", async () => {
    render(<DeliveryMapPanel tracking={trackingFixture()} onRoutePath={vi.fn()} />);

    expect(screen.getByRole("application", { name: /Delivery map/ })).toHaveClass(
      "h-72",
      "w-full",
      "md:h-96"
    );
    expect(screen.getByTestId("osm-tiles")).toHaveAttribute(
      "data-url",
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
    expect(screen.getByTestId("osm-tiles")).toHaveAttribute(
      "data-attribution",
      "© OpenStreetMap contributors"
    );
    expect(screen.getByTestId("marker-Courier")).toHaveAttribute(
      "data-position",
      "[6.9344,79.8428]"
    );
    expect(screen.getByTestId("marker-Pickup")).toBeInTheDocument();
    expect(screen.getByTestId("marker-Drop-off")).toBeInTheDocument();
    expect(screen.getByText("Navigate to pickup location")).toBeInTheDocument();
    await waitFor(() => expect(mapMocks.invalidateSize).toHaveBeenCalled());
  });

  it("routes pending deliveries to pickup using OSRM longitude,latitude order", async () => {
    render(<DeliveryMapPanel tracking={trackingFixture("pending")} onRoutePath={vi.fn()} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toContain(
      "/route/v1/driving/79.8428,6.9344;79.8521,6.9147"
    );
    expect(url.searchParams.get("overview")).toBe("full");
    expect(url.searchParams.get("geometries")).toBe("geojson");
    expect(url.searchParams.get("alternatives")).toBe("true");
  });

  it.each(["picked_up", "in_transit", "out_for_delivery"] as const)(
    "routes %s deliveries to drop-off",
    async (status) => {
      const { rerender } = render(
        <DeliveryMapPanel
          tracking={trackingFixture(status)}
          onRoutePath={vi.fn()}
        />
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      expect(String(fetchMock.mock.calls[0][0])).toContain(
        ";79.8933,6.9094?overview=full"
      );
      expect(screen.getByText("Navigate to delivery location")).toBeInTheDocument();
      expect(screen.getAllByText("Pickup complete").length).toBeGreaterThan(0);
      if (status === "picked_up") {
        rerender(
          <DeliveryMapPanel
            tracking={trackingFixture("in_transit")}
            onRoutePath={vi.fn()}
          />
        );
        expect(fetchMock).toHaveBeenCalledOnce();
      }
    }
  );

  it("recalculates from pickup to drop-off after the courier marks pickup complete", async () => {
    const view = render(
      <DeliveryMapPanel
        tracking={trackingFixture("pending")}
        onRoutePath={vi.fn()}
      />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(String(fetchMock.mock.calls[0][0])).toContain(";79.8521,6.9147?");

    view.rerender(
      <DeliveryMapPanel
        tracking={trackingFixture("picked_up")}
        onRoutePath={vi.fn()}
      />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain(";79.8933,6.9094?");
  });

  it("draws the shortest alternative using Leaflet latitude,longitude coordinates", async () => {
    render(<DeliveryMapPanel tracking={trackingFixture()} onRoutePath={vi.fn()} />);

    const polyline = await screen.findByTestId("route-polyline");
    expect(JSON.parse(polyline.getAttribute("data-positions")!)).toEqual([
      [6.9344, 79.8428],
      [6.923, 79.848],
      [6.9147, 79.8521],
    ]);
    expect(screen.getByText(/5\.0 km · 15 min/)).toBeInTheDocument();
    expect(screen.getByText(/Shortest distance may not be the fastest in traffic/)).toBeInTheDocument();
  });

  it("does not reroute or refit bounds for a small courier movement", async () => {
    const tracking = trackingFixture();
    const view = render(
      <DeliveryMapPanel tracking={tracking} onRoutePath={vi.fn()} />
    );
    await screen.findByTestId("route-polyline");
    const boundsCalls = mapMocks.fitBounds.mock.calls.length;

    view.rerender(
      <DeliveryMapPanel
        tracking={{
          ...tracking,
          courier_location: {
            ...tracking.courier_location!,
            lat: 6.9345,
            lng: 79.8429,
          },
        }}
        onRoutePath={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("marker-Courier")).toHaveAttribute(
        "data-position",
        "[6.9345,79.8429]"
      );
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mapMocks.fitBounds).toHaveBeenCalledTimes(boundsCalls);
  });

  it("shows retry without drawing a road line when OSRM fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));
    render(<DeliveryMapPanel tracking={trackingFixture()} onRoutePath={vi.fn()} />);

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.queryByTestId("route-polyline")).not.toBeInTheDocument();
    expect(screen.getByText("Route unavailable.")).toBeInTheDocument();
    fireEvent.click(retry);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("keeps the decoded mock route and moves the courier marker on simulation updates", async () => {
    fetchMock.mockRejectedValueOnce(new Error("OSRM unavailable"));
    const tracking = trackingFixture("pending", "simulated");
    const view = render(
      <DeliveryMapPanel tracking={tracking} onRoutePath={vi.fn()} />
    );

    expect(await screen.findByText(/Mock route/)).toBeInTheDocument();
    expect(await screen.findByTestId("route-polyline")).toBeInTheDocument();
    view.rerender(
      <DeliveryMapPanel
        tracking={{
          ...tracking,
          courier_location: {
            ...tracking.courier_location!,
            lat: 6.9345,
            lng: 79.8429,
          },
        }}
        onRoutePath={vi.fn()}
      />
    );
    expect(screen.getByTestId("marker-Courier")).toHaveAttribute(
      "data-position",
      "[6.9345,79.8429]"
    );
    expect(screen.getByText("Simulated GPS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it.each(["delivered", "cancelled"] as const)(
    "does not route terminal %s deliveries",
    (status) => {
      render(
        <DeliveryMapPanel
          tracking={trackingFixture(status)}
          onRoutePath={vi.fn()}
        />
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId("route-polyline")).not.toBeInTheDocument();
      expect(
        screen.getByText(status === "delivered" ? "Delivery completed" : "Delivery cancelled")
      ).toBeInTheDocument();
    }
  );

  it("aborts an in-flight route request when the map unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(
      (_url: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal as AbortSignal;
        return new Promise<Response>(() => {});
      }
    );
    const view = render(
      <DeliveryMapPanel tracking={trackingFixture()} onRoutePath={vi.fn()} />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    view.unmount();

    expect(requestSignal?.aborted).toBe(true);
  });
});
