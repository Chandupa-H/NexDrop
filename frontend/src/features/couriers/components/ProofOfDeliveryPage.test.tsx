import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCourierProofs, getAssignedParcels, getParcelDetail, uploadDeliveryProof, submitSuccessfulDelivery, deleteDeliveryProof, submitFailedDelivery, updateParcelStatus, router } = vi.hoisted(() => ({
  getCourierProofs: vi.fn(),
  getAssignedParcels: vi.fn(),
  getParcelDetail: vi.fn(),
  uploadDeliveryProof: vi.fn(),
  submitSuccessfulDelivery: vi.fn(),
  deleteDeliveryProof: vi.fn(),
  submitFailedDelivery: vi.fn(),
  updateParcelStatus: vi.fn(),
  router: { refresh: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../api/courier.api", () => ({
  getCourierProofs,
  getAssignedParcels,
  getParcelDetail,
  uploadDeliveryProof,
  submitSuccessfulDelivery,
  deleteDeliveryProof,
  submitFailedDelivery,
  updateParcelStatus,
}));
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

const eligibleParcels = [
  {
    tracking_id: "NXD001244",
    customer_name: "Amaya Jayasuriya",
    customer_phone_masked: "+94 772 *** 5633",
    destination: "Kandy",
    address_line: "78 Hill Street, Kandy",
    status: "out_for_delivery",
    assigned_at: "2026-10-31T07:30:00+05:30",
    eta: "2026-10-31T11:00:00+05:30",
    notes: [], timeline: [], delivery_proof: null, delivery_result: null,
    proof_cleanup_pending: false,
  },
  {
    tracking_id: "NXD001242",
    customer_name: "Kavindu Perera",
    customer_phone_masked: "+94 773 *** 6744",
    destination: "Colombo",
    address_line: "34 Bambalapitiya, Colombo 04",
    status: "out_for_delivery",
    assigned_at: "2026-10-31T07:15:00+05:30",
    eta: "2026-10-31T10:30:00+05:30",
    notes: [], timeline: [], delivery_proof: null, delivery_result: null,
    proof_cleanup_pending: false,
  },
];

describe("ProofOfDeliveryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    getCourierProofs.mockResolvedValue(response);
    getAssignedParcels.mockResolvedValue({
      items: eligibleParcels.map(({ tracking_id, customer_name, status, destination, assigned_at, eta }) => ({
        tracking_id, customer_name, status, destination, assigned_at, eta,
      })),
      total: eligibleParcels.length,
    });
    getParcelDetail.mockImplementation(async (trackingId: string) =>
      eligibleParcels.find((parcel) => parcel.tracking_id === trackingId)
    );
    uploadDeliveryProof.mockImplementation(async (trackingId: string, _file: File, onProgress: (value: number) => void) => {
      onProgress(100);
      const parcel = eligibleParcels.find((item) => item.tracking_id === trackingId);
      return {
        secure_url: "https://proof.test/uploaded.png",
        public_id: `proof-${trackingId}`,
        parcel: { ...parcel, delivery_proof: { secure_url: "https://proof.test/uploaded.png", public_id: `proof-${trackingId}` } },
      };
    });
    submitSuccessfulDelivery.mockImplementation(async (trackingId: string, payload: { recipient_name: string; confirmed: boolean }) => {
      const parcel = eligibleParcels.find((item) => item.tracking_id === trackingId);
      return {
        ...parcel,
        status: "delivered",
        delivery_proof: { secure_url: "https://proof.test/uploaded.png", public_id: `proof-${trackingId}` },
        delivery_result: { outcome: "delivered", recipient_name: payload.recipient_name, recorded_at: "2026-11-10T10:00:00+05:30" },
      };
    });
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

  it("loads eligible parcels, searches them, and returns to the selector with its query intact", async () => {
    render(<ProofOfDeliveryPage />);
    await screen.findByText("NXD001248");
    fireEvent.click(screen.getByRole("button", { name: "Add Delivery Proof" }));

    expect(await screen.findByText("78 Hill Street, Kandy")).toBeInTheDocument();
    expect(getAssignedParcels).toHaveBeenCalledWith({ status: "out_for_delivery", limit: 100 });
    expect(getParcelDetail).toHaveBeenCalledTimes(2);
    expect(screen.getByText("34 Bambalapitiya, Colombo 04")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Search eligible parcels" }), { target: { value: "Kavindu" } });
    expect(screen.queryByText("Amaya Jayasuriya")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select parcel" }));
    expect(await screen.findByRole("dialog", { name: "NXD001242" })).toBeInTheDocument();
    expect(screen.getByText("Confirm this delivery")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close parcel details" }));
    expect(await screen.findByRole("textbox", { name: "Search eligible parcels" })).toHaveValue("Kavindu");
    expect(screen.queryByText("Amaya Jayasuriya")).not.toBeInTheDocument();
  });

  it("uses the existing delivery confirmation upload flow and refreshes proof history after success", async () => {
    getAssignedParcels
      .mockResolvedValueOnce({
        items: eligibleParcels.map(({ tracking_id, customer_name, status, destination, assigned_at, eta }) => ({
          tracking_id, customer_name, status, destination, assigned_at, eta,
        })),
        total: eligibleParcels.length,
      })
      .mockResolvedValue({ items: [], total: 0 });
    render(<ProofOfDeliveryPage />);
    await screen.findByText("NXD001248");
    fireEvent.click(screen.getByRole("button", { name: "Add Delivery Proof" }));
    await screen.findByText("78 Hill Street, Kandy");
    fireEvent.click(screen.getAllByRole("button", { name: "Select parcel" })[0]);
    await screen.findByRole("dialog", { name: "NXD001244" });
    fireEvent.change(screen.getByLabelText(/Recipient name/), { target: { value: "Amaya Jayasuriya" } });
    const photo = new File(["mock photo"], "proof.png", { type: "image/png" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [photo] } });
    fireEvent.click(screen.getByLabelText(/I confirm this parcel/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delivered" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Delivery confirmed. The proof has been added to your delivery history.");
    await waitFor(() => expect(getCourierProofs).toHaveBeenCalledTimes(2));
    expect(uploadDeliveryProof).toHaveBeenCalledWith("NXD001244", photo, expect.any(Function));
    expect(submitSuccessfulDelivery).toHaveBeenCalledWith("NXD001244", { recipient_name: "Amaya Jayasuriya", confirmed: true });
    expect(screen.queryByRole("dialog", { name: "NXD001244" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Delivery Proof" }));
    expect(await screen.findByText("No eligible parcels")).toBeInTheDocument();
  });
});
