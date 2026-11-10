import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCourierProofs } = vi.hoisted(() => ({ getCourierProofs: vi.fn() }));
vi.mock("../api/courier.api", () => ({ getCourierProofs }));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

import { ProofOfDeliveryPage } from "./ProofOfDeliveryPage";

const response = {
  items: [
    {
      tracking_number: "NXD001248",
      recipient_name: "Kavindu Perera",
      delivered_at: "2026-10-31T10:15:00+05:30",
      delivery_address: "123 Galle Road, Colombo 03",
      status: "delivered",
      secure_url: "https://placehold.co/960x720/png?text=MOCK+PROOF+NXD001248",
      public_id: "mock-proof-NXD001248",
    },
  ],
  total: 1,
  summary: { total_proofs: 3, successful_deliveries: 3, parcels_with_proof: 3 },
};

describe("ProofOfDeliveryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCourierProofs.mockResolvedValue(response);
  });

  it("loads records and backend summary values", async () => {
    render(<ProofOfDeliveryPage />);
    expect(await screen.findByText("NXD001248")).toBeInTheDocument();
    expect(screen.getByText("Kavindu Perera")).toBeInTheDocument();
    expect(screen.getByText("123 Galle Road, Colombo 03")).toBeInTheDocument();
    expect(screen.getByText("Total Proof Records")).toBeInTheDocument();
    expect(screen.getByText("Successful Deliveries")).toBeInTheDocument();
    expect(screen.getByText("Parcels with Proof")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Proof photo for NXD001248" })).toHaveAttribute("data-src", response.items[0].secure_url);
  });

  it("sends search, delivery date, and status filters to the backend", async () => {
    render(<ProofOfDeliveryPage />);
    await screen.findByText("NXD001248");

    fireEvent.change(screen.getByRole("textbox", { name: "Search tracking number or recipient" }), { target: { value: "Kavindu" } });
    fireEvent.change(screen.getByLabelText("Filter by delivery date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Filter by delivery status"), { target: { value: "delivered" } });

    await waitFor(() => {
      expect(getCourierProofs).toHaveBeenLastCalledWith({ q: "Kavindu", date: "2026-10-31", status: "delivered" });
    });
  });

  it("opens the proof lightbox and closes it by button or Escape", async () => {
    render(<ProofOfDeliveryPage />);
    await screen.findByText("NXD001248");
    fireEvent.click(screen.getByRole("button", { name: "View Proof" }));
    expect(screen.getByRole("dialog", { name: "NXD001248" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: "NXD001248" })).getByText("123 Galle Road, Colombo 03")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "NXD001248" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View Proof" }));
    fireEvent.click(screen.getByRole("button", { name: "Close proof image" }));
    expect(screen.queryByRole("dialog", { name: "NXD001248" })).not.toBeInTheDocument();
  });

  it("shows a helpful empty state when filters return no records", async () => {
    getCourierProofs.mockResolvedValueOnce({ ...response, items: [], total: 0 });
    render(<ProofOfDeliveryPage />);
    expect(await screen.findByText("No proof records yet")).toBeInTheDocument();
  });
});
