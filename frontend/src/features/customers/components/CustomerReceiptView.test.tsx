import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerReceiptView } from "./CustomerReceiptView";
import { CustomerParcelsTable } from "./CustomerParcelsTable";
import { getCustomerParcelDetail } from "../api/customer.api";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";
import type { CustomerParcelStatus } from "../types";
import { formatReceiptEstimate, isCustomerReceiptEligible } from "../lib/receipt";

vi.mock("../api/customer.api", () => ({ getCustomerParcelDetail: vi.fn() }));
const getDetail = vi.mocked(getCustomerParcelDetail);
const statuses: CustomerParcelStatus[] = ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled"];

// Test response only; no receipt or payment records are added to the application.
const shipment: CustomerParcelDetailDTO = {
  tracking_id: "ND-TEST", status: "delivered", sender_name: "Test sender",
  recipient_name: "Test recipient", recipient_phone_masked: "*** 1234",
  delivery_address: "Test destination", delivery_city: "Test city",
  pickup_address: "Test pickup", pickup_city: "Test city", created_at: "2026-11-10T10:00:00Z",
  fee: 400, eta: null, weight_kg: 1, notes: [], timeline: [],
};

describe("customer shipment receipts", () => {
  beforeEach(() => { vi.resetAllMocks(); getDetail.mockResolvedValue(shipment); });

  it.each(statuses)("offers receipts only for delivered shipments (%s)", (status) => {
    expect(isCustomerReceiptEligible(status, "ND-TEST")).toBe(status === "delivered");
  });
  it("requires a tracking number and never supplies a replacement fee", () => {
    expect(isCustomerReceiptEligible("delivered", " ")).toBe(false);
    for (const fee of [undefined, null, NaN, Infinity, -1, "400"]) expect(formatReceiptEstimate(fee)).toBe("Not available");
    expect(formatReceiptEstimate(0)).toBe("Rs. 0.00");
  });

  it("shows a history receipt link only for delivered rows, preserving default dashboard actions", () => {
    const props = {
      parcels: statuses.map((status) => ({ trackingId: `ND-${status}`, status, recipientName: "Test recipient",
        destination: "Test city", createdAt: shipment.created_at, createdAtDisplay: "Test date",
        estimatedFee: 400, weightKg: 1, eta: null })),
      total: statuses.length, filter: "all" as const, onFilterChange: vi.fn(), onSelectParcel: vi.fn(),
    };
    const { rerender } = render(<CustomerParcelsTable {...props} />);
    expect(screen.queryByRole("link", { name: /view shipment receipt/i })).not.toBeInTheDocument();
    rerender(<CustomerParcelsTable {...props} showReceipts />);
    const links = screen.getAllByRole("link", { name: /view shipment receipt/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/customer/history/receipt?trackingId=ND-delivered");
    links[0].addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(links[0]);
    expect(props.onSelectParcel).not.toHaveBeenCalled();
  });

  it("renders shipment information and labels the estimate without claiming payment", async () => {
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading shipment receipt");
    expect(screen.queryByRole("button", { name: "Print / Save as PDF" })).not.toBeInTheDocument();
    const article = await screen.findByRole("article", { name: "Shipment receipt" });
    expect(getDetail).toHaveBeenCalledWith("ND-TEST", false);
    expect(article).toHaveTextContent("Test sender");
    expect(article).toHaveTextContent("Test recipient");
    expect(article).toHaveTextContent("*** 1234");
    expect(article).toHaveTextContent("Test destination, Test city");
    expect(article).toHaveTextContent("Estimated delivery fee (unverified)");
    expect(article).toHaveTextContent("Rs. 400.00");
    expect(article).toHaveTextContent("not proof of payment");
    expect(article).toHaveTextContent("Confirmed payment amountNot available");
    expect(article).not.toHaveTextContent("Transaction ID");
    expect(article).not.toHaveTextContent("Receipt number");
  });

  it("handles missing fields, invalid dates and missing fees without fabricating values", async () => {
    getDetail.mockResolvedValue({ ...shipment, sender_name: "", recipient_name: "", delivery_address: "", delivery_city: "",
      recipient_phone_masked: "", created_at: "invalid", fee: undefined as unknown as number });
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Estimated delivery fee (unverified)Not available");
    expect(article).toHaveTextContent("Booked on (Asia/Colombo)Not available");
    expect(article).not.toHaveTextContent("NaN");
    expect(article).not.toHaveTextContent("Invalid Date");
  });

  it("does not print an ineligible shipment, even through a direct route", async () => {
    getDetail.mockResolvedValue({ ...shipment, status: "pending" });
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    expect(await screen.findByText(/Shipment receipt unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print / Save as PDF" })).not.toBeInTheDocument();
  });
  it("does not fetch or print when the route has no tracking number", () => {
    render(<CustomerReceiptView trackingId="" />);
    expect(screen.getByRole("status")).toHaveTextContent("Shipment receipt unavailable");
    expect(getDetail).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Print / Save as PDF" })).not.toBeInTheDocument();
  });

  it("opens the browser print workflow and reports print failures", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    const button = await screen.findByRole("button", { name: "Print / Save as PDF" });
    fireEvent.click(button);
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/choose Save as PDF/)).toBeInTheDocument();
    print.mockImplementationOnce(() => { throw new Error("Unavailable"); });
    fireEvent.click(button);
    expect(screen.getByRole("alert")).toHaveTextContent("Printing could not be opened");
    print.mockRestore();
  });

  it("retries API errors and rejects mismatched shipment details", async () => {
    getDetail.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce({ ...shipment, tracking_id: "ND-OTHER" });
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });

  it("ignores late responses when the requested shipment changes", async () => {
    let resolve!: (value: CustomerParcelDetailDTO) => void;
    getDetail.mockImplementationOnce(() => new Promise((done) => { resolve = done; }))
      .mockResolvedValueOnce({ ...shipment, tracking_id: "ND-NEW" });
    const { rerender } = render(<CustomerReceiptView trackingId="ND-TEST" />);
    rerender(<CustomerReceiptView trackingId="ND-NEW" />);
    await screen.findByRole("article");
    await act(async () => resolve(shipment));
    expect(screen.getByRole("article")).toHaveTextContent("ND-NEW");
  });
});
