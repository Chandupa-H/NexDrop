import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParcelDetailsDrawer } from "./ParcelDetailsDrawer";
import {
  deleteDeliveryProof,
  getParcelDetail,
  submitFailedDelivery,
  submitSuccessfulDelivery,
  updateParcelStatus,
  uploadDeliveryProof,
} from "../api/courier.api";

vi.mock("../api/courier.api", () => ({
  getParcelDetail: vi.fn(),
  updateParcelStatus: vi.fn(),
  uploadDeliveryProof: vi.fn(),
  deleteDeliveryProof: vi.fn(),
  submitSuccessfulDelivery: vi.fn(),
  submitFailedDelivery: vi.fn(),
}));

vi.mock("@/components/dashboard", () => ({
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

const parcelDto = (status = "out_for_delivery") => ({
  tracking_id: "NXD-UI-TEST",
  customer_name: "Test Customer",
  customer_phone_masked: "+94 *** 1234",
  destination: "Colombo",
  address_line: "Test address",
  status,
  assigned_at: "2026-11-01T08:00:00+05:30",
  eta: null,
  notes: [],
  timeline: [],
  delivery_proof: null,
  delivery_result: null,
  proof_cleanup_pending: false,
});

describe("ParcelDetailsDrawer delivery result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    vi.mocked(getParcelDetail).mockResolvedValue(parcelDto() as never);
    vi.mocked(uploadDeliveryProof).mockImplementation(async (_id, _file, onProgress) => {
      onProgress(67);
      return {
        secure_url: "https://proof.test/image.png",
        public_id: "proof-ui",
        parcel: {
          ...parcelDto(),
          delivery_proof: { secure_url: "https://proof.test/image.png", public_id: "proof-ui" },
        },
      } as never;
    });
    vi.mocked(submitSuccessfulDelivery).mockResolvedValue({
      ...parcelDto("delivered"),
      delivery_proof: { secure_url: "https://proof.test/image.png", public_id: "proof-ui" },
      delivery_result: { outcome: "delivered", recipient_name: "Recipient", recorded_at: "now" },
    } as never);
    vi.mocked(submitFailedDelivery).mockResolvedValue({
      ...parcelDto("failed"),
      delivery_result: { outcome: "failed", failure_reason: "customer_unavailable", recorded_at: "now" },
    } as never);
  });

  const renderDrawer = (action?: "upload-proof" | "report-failed") => render(
    <ParcelDetailsDrawer trackingId="NXD-UI-TEST" action={action} onClose={vi.fn()} onStatusUpdated={vi.fn()} />
  );

  it("validates recipient and proof before success submission", async () => {
    renderDrawer();
    await screen.findByRole("button", { name: "Mark as delivered" });
    expect(screen.queryByLabelText(/Recipient name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Proof photo/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Mark as delivered" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delivered" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("recipient's name");
    expect(submitSuccessfulDelivery).not.toHaveBeenCalled();
  });

  it("previews a photo, confirms, reports upload progress, and submits the result", async () => {
    const onStatusUpdated = vi.fn();
    const onSuccessfulDelivery = vi.fn();
    let finishUpload: (() => void) | undefined;
    vi.mocked(uploadDeliveryProof).mockImplementationOnce(async (_id, _file, onProgress) => {
      onProgress(67);
      await new Promise<void>((resolve) => { finishUpload = resolve; });
      return {
        secure_url: "https://proof.test/image.png",
        public_id: "proof-ui",
        parcel: {
          ...parcelDto(),
          delivery_proof: { secure_url: "https://proof.test/image.png", public_id: "proof-ui" },
        },
      } as never;
    });
    render(<ParcelDetailsDrawer trackingId="NXD-UI-TEST" onClose={vi.fn()} onStatusUpdated={onStatusUpdated} onSuccessfulDelivery={onSuccessfulDelivery} />);
    fireEvent.click(await screen.findByRole("button", { name: "Mark as delivered" }));
    fireEvent.change(screen.getByLabelText(/Recipient name/), { target: { value: "Recipient" } });
    const file = new File(["mock png"], "proof.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Proof photo/), { target: { files: [file] } });
    expect(await screen.findByAltText("Delivery proof preview")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I confirm this parcel/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delivered" }));
    expect(await screen.findByText("Uploading proof… 67%")).toBeInTheDocument();
    finishUpload?.();
    await waitFor(() => expect(submitSuccessfulDelivery).toHaveBeenCalledWith("NXD-UI-TEST", {
      recipient_name: "Recipient",
      confirmed: true,
    }));
    expect(uploadDeliveryProof).toHaveBeenCalledWith("NXD-UI-TEST", file, expect.any(Function));
    expect(await screen.findByRole("status")).toHaveTextContent("Delivery confirmed successfully");
    expect(onStatusUpdated).toHaveBeenCalled();
    expect(onSuccessfulDelivery).toHaveBeenCalledTimes(1);
  });

  it("shows photo validation errors before uploading", async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole("button", { name: "Mark as delivered" }));
    const invalid = new File(["not an image"], "proof.svg", { type: "image/svg+xml" });
    fireEvent.change(screen.getByLabelText(/Proof photo/), { target: { files: [invalid] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JPEG, PNG, or WebP");
    expect(uploadDeliveryProof).not.toHaveBeenCalled();
  });

  it("rejects a photo larger than the client size limit", async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole("button", { name: "Mark as delivered" }));
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Proof photo/), { target: { files: [oversized] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("5 MB or smaller");
    expect(uploadDeliveryProof).not.toHaveBeenCalled();
  });

  it("deletes an already uploaded proof through the API", async () => {
    vi.mocked(getParcelDetail).mockResolvedValue({
      ...parcelDto(),
      delivery_proof: { secure_url: "https://proof.test/old.png", public_id: "proof-old" },
    } as never);
    vi.mocked(deleteDeliveryProof).mockResolvedValue(parcelDto() as never);
    renderDrawer();
    fireEvent.click(await screen.findByRole("button", { name: "Mark as delivered" }));
    await screen.findByAltText("Delivery proof preview");
    fireEvent.click(screen.getByRole("button", { name: "Remove uploaded proof" }));
    await waitFor(() => expect(deleteDeliveryProof).toHaveBeenCalledWith("NXD-UI-TEST"));
  });

  it("requires failure reason and explicit confirmation before submitting", async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole("button", { name: "Report failed" }));
    const submitButton = screen.getByRole("button", { name: "Confirm failed delivery" });
    expect(submitButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for failed delivery"), { target: { value: "customer_unavailable" } });
    expect(submitButton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Add details that help explain the delivery attempt."), { target: { value: "No one answered the door" } });
    fireEvent.click(screen.getByLabelText(/I confirm this delivery attempt failed/));
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitFailedDelivery).toHaveBeenCalledWith("NXD-UI-TEST", {
      failure_reason: "customer_unavailable",
      note: "No one answered the door",
      confirmed: true,
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Failed delivery recorded successfully");
    expect(screen.queryByLabelText("Reason for failed delivery")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Parcel actions" })).not.toBeInTheDocument();
  });

  it("surfaces API errors to the courier", async () => {
    vi.mocked(submitFailedDelivery).mockRejectedValueOnce(new Error("Service unavailable"));
    renderDrawer();
    fireEvent.click(await screen.findByRole("button", { name: "Report failed" }));
    fireEvent.change(screen.getByLabelText("Reason for failed delivery"), { target: { value: "customer_unavailable" } });
    fireEvent.click(screen.getByLabelText(/I confirm this delivery attempt failed/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm failed delivery" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  });

  it("shows no action controls for delivered or failed parcels", async () => {
    for (const status of ["delivered", "failed"]) {
      vi.mocked(getParcelDetail).mockResolvedValue({
        ...parcelDto(status),
        delivery_result: {
          outcome: status,
          recorded_at: "2026-11-01T10:00:00+05:30",
          failure_reason: status === "failed" ? "customer_unavailable" : null,
        },
      } as never);
      const { unmount } = renderDrawer();
      await screen.findByRole("region", { name: "Status history" });
      expect(screen.queryByRole("region", { name: "Parcel actions" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Mark as delivered" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Report failed" })).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Delivery result" })).toBeInTheDocument();
      unmount();
    }
  });

  it("offers only the backend's next status transition for pending parcels", async () => {
    vi.mocked(getParcelDetail).mockResolvedValue(parcelDto("pending") as never);
    vi.mocked(updateParcelStatus).mockResolvedValue(parcelDto("picked_up") as never);
    renderDrawer();
    expect(await screen.findByRole("button", { name: "Picked Up" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report failed" })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Picked Up" }));
    await waitFor(() => {
      expect(updateParcelStatus).toHaveBeenCalledWith("NXD-UI-TEST", { status: "picked_up" });
    });
    expect(screen.queryByRole("button", { name: "Mark as delivered" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Report failed" })).toBeInTheDocument();
  });
});
