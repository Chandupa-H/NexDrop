import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";

const { getCourierDelivery, params, search } = vi.hoisted(() => ({
  getCourierDelivery: vi.fn(),
  params: { deliveryId: "2001" },
  search: { value: "?returnTo=%2Fcourier%2Fhistory%3Fstatus%3Dcancelled%26page%3D2" },
}));

vi.mock("../api/courier.api", () => ({ getCourierDelivery }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useParams: () => params,
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { DeliveryHistoryDetailPage } from "./DeliveryHistoryDetailPage";

const detail = {
  parcel_id: 2001,
  tracking_number: "ND-2026-H001",
  status: "delivered" as const,
  pickup_address: "Park Road & Main Street, Colombo 05",
  dropoff_address: "Flower Road, Colombo 07",
  size: "Small",
  weight: 1.4,
  recipient_name: "Dilani Perera",
  recipient_phone: "+94 77 345 6789",
  assigned_at: "2026-11-05T08:10:00+05:30",
  pickup_lat: 6.9,
  pickup_lng: 79.8,
  dropoff_lat: 6.91,
  dropoff_lng: 79.81,
  delivery_instructions: null,
  completed_at: "2026-11-05T10:42:00+05:30",
  failure_reason: null,
  status_history: [
    {
      status: "pending" as const,
      timestamp: "2026-11-05T08:10:00+05:30",
      note: "Delivery assigned.",
      proof_reference: null,
      actor: "System",
    },
    {
      status: "delivered" as const,
      timestamp: "2026-11-05T10:42:00+05:30",
      note: "Handed to recipient.",
      proof_reference: "POD-2001",
      actor: "Courier",
    },
  ],
};

describe("DeliveryHistoryDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    params.deliveryId = "2001";
    search.value = "?returnTo=%2Fcourier%2Fhistory%3Fstatus%3Dcancelled%26page%3D2";
  });

  it("shows read-only details, chronological timeline and encoded action links", async () => {
    getCourierDelivery.mockResolvedValue(detail);
    render(<DeliveryHistoryDetailPage />);

    expect(await screen.findByText("ND-2026-H001")).toBeInTheDocument();
    expect(screen.getAllByText("Proof reference: POD-2001")).toHaveLength(2);
    expect(screen.getByText("By Courier")).toBeInTheDocument();
    expect(screen.getByText("This delivery is closed.")).toBeInTheDocument();
    expect(screen.queryByTestId("delivery-action-area")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to delivery history/i })).toHaveAttribute(
      "href",
      "/courier/history?status=cancelled&page=2"
    );
    expect(screen.getAllByRole("link", { name: /open in maps/i })[0]).toHaveAttribute(
      "href",
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        "Park Road & Main Street, Colombo 05 6.9, 79.8"
      )}`
    );
    expect(screen.getByRole("link", { name: /\+94 77 345 6789/ })).toHaveAttribute(
      "href",
      "tel:+94773456789"
    );
    expect(getCourierDelivery).toHaveBeenCalledWith(2001);
  });

  it("shows friendly access-denied and not-found states", async () => {
    getCourierDelivery.mockRejectedValueOnce(new ApiError(403, "Access denied"));
    const { rerender } = render(<DeliveryHistoryDetailPage />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("Recipient data")).not.toBeInTheDocument();

    params.deliveryId = "2002";
    getCourierDelivery.mockRejectedValueOnce(new ApiError(404, "Not found"));
    rerender(<DeliveryHistoryDetailPage />);
    expect(await screen.findByText("Delivery not found")).toBeInTheDocument();
  });

  it("shows cancellation reason in the terminal read-only view", async () => {
    getCourierDelivery.mockResolvedValue({
      ...detail,
      status: "cancelled",
      failure_reason: "Recipient unavailable.",
    });
    render(<DeliveryHistoryDetailPage />);
    expect(await screen.findByText("Cancellation reason: Recipient unavailable.")).toBeInTheDocument();
  });
});
