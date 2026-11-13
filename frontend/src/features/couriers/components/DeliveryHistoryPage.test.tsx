import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDeliveryHistory, push, state } = vi.hoisted(() => ({
  getDeliveryHistory: vi.fn(),
  push: vi.fn(),
  state: { query: "" },
}));

vi.mock("../api/courier.api", () => ({ getDeliveryHistory }));
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
  usePathname: () => "/courier/history",
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(state.query),
}));

import { DeliveryHistoryPage } from "./DeliveryHistoryPage";

const historyResponse = {
  items: [
    {
      parcel_id: 2001,
      tracking_number: "ND-2026-H001",
      status: "delivered" as const,
      pickup_address: "Park Road, Colombo",
      dropoff_address: "Flower Road, Colombo",
      recipient_name: "Dilani Perera",
      completed_at: "2026-11-05T10:42:00+05:30",
      failure_reason: null,
    },
    {
      parcel_id: 2002,
      tracking_number: "ND-2026-H002",
      status: "cancelled" as const,
      pickup_address: "Nugegoda",
      dropoff_address: "Pagoda Road, Nugegoda",
      recipient_name: "Ruwan Jayasinghe",
      completed_at: "2026-11-04T11:25:00+05:30",
      failure_reason: "Recipient unavailable.",
    },
  ],
  total: 2,
  page: 1,
  page_size: 8,
  history_summary: { delivered: 1, cancelled: 1, total: 2 },
};

describe("DeliveryHistoryPage", () => {
  beforeEach(() => {
    state.query = "";
    vi.clearAllMocks();
    getDeliveryHistory.mockResolvedValue(historyResponse);
  });

  it("renders history cards, summary, status labels, recipient and failure reason", async () => {
    render(<DeliveryHistoryPage />);

    expect(await screen.findByText("ND-2026-H001")).toBeInTheDocument();
    expect(screen.getByText("Dilani Perera")).toBeInTheDocument();
    expect(screen.getAllByText("Delivered").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(1);
    expect(screen.getByText("Recipient unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Park Road, Colombo")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view details/i })[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/courier/history/2001?")
    );
    expect(screen.getAllByText("1")).toHaveLength(2);
  });

  it("reflects status and date filters in the URL and sends URL filters to the API", async () => {
    render(<DeliveryHistoryPage />);

    fireEvent.click(await screen.findByRole("tab", { name: "Cancelled" }));
    expect(push).toHaveBeenCalledWith(
      "/courier/history?status=cancelled",
      { scroll: false }
    );

    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-11-01" },
    });
    expect(push).toHaveBeenLastCalledWith(
      "/courier/history?from=2026-11-01",
      { scroll: false }
    );

    state.query = "status=delivered&page=2&q=Dilani";
    render(<DeliveryHistoryPage />);
    await waitFor(() => {
      expect(getDeliveryHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: "delivered",
          page: 2,
          q: "Dilani",
          page_size: 8,
        })
      );
    });
  });

  it("debounces search into the URL and exposes a loading skeleton", async () => {
    getDeliveryHistory.mockReturnValueOnce(new Promise(() => {}));
    render(<DeliveryHistoryPage />);
    expect(
      screen.getByRole("status", { name: "Loading delivery history" })
    ).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Search tracking number or recipient"), {
      target: { value: "Dilani" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(push).toHaveBeenCalledWith("/courier/history?q=Dilani", {
      scroll: false,
    });
    vi.useRealTimers();
  });

  it("shows loading, empty and retryable error states", async () => {
    getDeliveryHistory.mockResolvedValueOnce({
      ...historyResponse,
      items: [],
      total: 0,
      history_summary: { delivered: 0, cancelled: 0, total: 0 },
    });
    const empty = render(<DeliveryHistoryPage />);
    expect(await screen.findByText("No past deliveries yet")).toBeInTheDocument();
    empty.unmount();

    getDeliveryHistory.mockRejectedValueOnce(new Error("network"));
    getDeliveryHistory.mockResolvedValueOnce(historyResponse);
    render(<DeliveryHistoryPage />);
    expect(
      await screen.findByText("Unable to load delivery history")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByText("ND-2026-H001")).toBeInTheDocument();
  });
});
