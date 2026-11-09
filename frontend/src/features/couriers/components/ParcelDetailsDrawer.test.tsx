import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParcelDetailsDrawer } from "./ParcelDetailsDrawer";
import {
  deleteDeliveryProof,
  getParcelDetail,
  submitFailedDelivery,
  submitSuccessfulDelivery,
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

  const renderDrawer = (action: "upload-proof" | "report-failed" = "upload-proof") => render(
    <ParcelDetailsDrawer trackingId="NXD-UI-TEST" action={action} onClose={vi.fn()} onStatusUpdated={vi.fn()} />
  );

  it("validates recipient and proof before success submission", async () => {
    renderDrawer();
    await screen.findByText("Actions");
    fireEvent.click(screen.getByRole("button", { name: "Confirm Successful Delivery" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("recipient's name");
    expect(submitSuccessfulDelivery).not.toHaveBeenCalled();
  });

  it("previews a photo, confirms, reports upload progress, and submits the result", async () => {
    const onStatusUpdated = vi.fn();
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
    render(<ParcelDetailsDrawer trackingId="NXD-UI-TEST" action="upload-proof" onClose={vi.fn()} onStatusUpdated={onStatusUpdated} />);
    await screen.findByText("Actions");
    fireEvent.change(screen.getByLabelText(/Recipient Name/), { target: { value: "Recipient" } });
    const file = new File(["mock png"], "proof.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Delivery Proof Photo/), { target: { files: [file] } });
    expect(await screen.findByAltText("Delivery proof preview")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I confirm this parcel/));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Successful Delivery/ }));
    expect(await screen.findByText("Uploading proof… 67%")).toBeInTheDocument();
    finishUpload?.();
    await waitFor(() => expect(submitSuccessfulDelivery).toHaveBeenCalledWith("NXD-UI-TEST", {
      recipient_name: "Recipient",
      confirmed: true,
    }));
    expect(uploadDeliveryProof).toHaveBeenCalledWith("NXD-UI-TEST", file, expect.any(Function));
    expect(await screen.findByRole("status")).toHaveTextContent("Delivery confirmed successfully");
    expect(onStatusUpdated).toHaveBeenCalled();
  });

  it("shows photo validation errors before uploading", async () => {
    renderDrawer();
    await screen.findByText("Actions");
    const invalid = new File(["not an image"], "proof.svg", { type: "image/svg+xml" });
    fireEvent.change(screen.getByLabelText(/Delivery Proof Photo/), { target: { files: [invalid] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JPEG, PNG, or WebP");
    expect(uploadDeliveryProof).not.toHaveBeenCalled();
  });

  it("rejects a photo larger than the client size limit", async () => {
    renderDrawer();
    await screen.findByText("Actions");
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Delivery Proof Photo/), { target: { files: [oversized] } });
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
    await screen.findByAltText("Delivery proof preview");
    fireEvent.click(screen.getByRole("button", { name: "Remove uploaded proof" }));
    await waitFor(() => expect(deleteDeliveryProof).toHaveBeenCalledWith("NXD-UI-TEST"));
  });

  it("requires failure reason and explicit confirmation before submitting", async () => {
    renderDrawer("report-failed");
    await screen.findByText("Actions");
    const submitButton = screen.getByRole("button", { name: "Reject Delivery" });
    expect(submitButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Failure Reason"), { target: { value: "customer_unavailable" } });
    expect(submitButton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Describe the issue..."), { target: { value: "No one answered the door" } });
    fireEvent.click(screen.getByLabelText(/I confirm this delivery attempt failed/));
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitFailedDelivery).toHaveBeenCalledWith("NXD-UI-TEST", {
      failure_reason: "customer_unavailable",
      note: "No one answered the door",
      confirmed: true,
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Failed delivery recorded successfully");
    expect(screen.queryByLabelText("Failure Reason")).not.toBeInTheDocument();
    expect(screen.queryByText("Report Failed Delivery")).not.toBeInTheDocument();
  });

  it("surfaces API errors to the courier", async () => {
    vi.mocked(submitFailedDelivery).mockRejectedValueOnce(new Error("Service unavailable"));
    renderDrawer("report-failed");
    await screen.findByText("Actions");
    fireEvent.change(screen.getByLabelText("Failure Reason"), { target: { value: "customer_unavailable" } });
    fireEvent.click(screen.getByLabelText(/I confirm this delivery attempt failed/));
    fireEvent.click(screen.getByRole("button", { name: "Reject Delivery" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  });
});
