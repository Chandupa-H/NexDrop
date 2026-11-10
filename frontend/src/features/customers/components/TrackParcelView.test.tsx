import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TrackParcelView } from "./TrackParcelView";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

describe("TrackParcelView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders the tracking search form", async () => {
    render(<TrackParcelView />);

    expect(screen.getByText("Track a Shipment")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter tracking code/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Track Parcel/i })
    ).toBeInTheDocument();
  });

  it("renders parcel milestones and details when id is in search params", async () => {
    mockSearchParams = new URLSearchParams("id=NXD-CUS-101");

    render(<TrackParcelView />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "NXD-CUS-101" })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Delivery Milestones Progress")).toBeInTheDocument();
    expect(screen.getByText("Shipment Activity Log")).toBeInTheDocument();
    expect(screen.getByText("Consignment Details")).toBeInTheDocument();
    expect(screen.getAllByText("Order Created").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Delivered").length).toBeGreaterThanOrEqual(1);
  });

  it("submits the tracking input form and updates route query", async () => {
    render(<TrackParcelView />);

    const input = screen.getByPlaceholderText(/enter tracking code/i);
    fireEvent.change(input, { target: { value: "NXD-CUS-102" } });

    const trackBtn = screen.getByRole("button", { name: /Track Parcel/i });
    fireEvent.click(trackBtn);

    expect(mockReplace).toHaveBeenCalledWith("/customer/track?id=NXD-CUS-102");
  });
});
