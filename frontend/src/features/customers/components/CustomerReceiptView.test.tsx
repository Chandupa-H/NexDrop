import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerReceiptView } from "./CustomerReceiptView";
import { CustomerParcelDrawer } from "./CustomerParcelDrawer";
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

  it("shows a receipt link next to Full Tracking Page for delivered shipments in drawer", async () => {
    getDetail.mockResolvedValueOnce(shipment);
    render(<CustomerParcelDrawer trackingId="ND-TEST" onClose={vi.fn()} onParcelUpdated={vi.fn()} />);
    await screen.findByText("Parcel Specifications");
    const link = screen.getByRole("link", { name: /view shipment receipt/i });
    expect(link).toHaveAttribute("href", "/customer/history/receipt?trackingId=ND-TEST");
    expect(screen.getByRole("link", { name: /full tracking page/i })).toBeInTheDocument();
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
    expect(article).toHaveTextContent("Delivery fee");
    expect(article).toHaveTextContent("Rs. 400.00");
    expect(article).toHaveTextContent("NexDrop");
    expect(article).toHaveTextContent("Official Delivery Receipt");
    expect(article).toHaveTextContent("Verified Proof of Delivery");
    expect(article).toHaveTextContent("Thank you for shipping with NexDrop!");
    expect(article).not.toHaveTextContent("not proof of payment");
    expect(article).not.toHaveTextContent("Transaction ID");
    expect(article).not.toHaveTextContent("Receipt number");
    expect(article).not.toHaveTextContent("—");
  });

  it("displays confirmed delivery date fetched from delivered_at or timeline without em dashes", async () => {
    getDetail.mockResolvedValueOnce({
      ...shipment,
      recipient_phone: "+94779876543",
      delivered_at: "2026-11-08T15:45:00Z",
    });
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Confirmed delivery date");
    expect(article).toHaveTextContent("+94779876543");
    expect(article).not.toHaveTextContent("—");
  });

  it("handles missing fields, invalid dates and missing fees without fabricating values", async () => {
    getDetail.mockResolvedValue({ ...shipment, sender_name: "", recipient_name: "", delivery_address: "", delivery_city: "",
      recipient_phone_masked: "", created_at: "invalid", fee: undefined as unknown as number });
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Delivery feeNot available");
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
    expect(screen.queryByText(/choose Save as PDF/)).not.toBeInTheDocument();
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

  it("shows Back to Delivery History by default or when from is not track", async () => {
    render(<CustomerReceiptView trackingId="ND-TEST" />);
    await screen.findByRole("article");
    const backLink = screen.getByRole("link", { name: /back to delivery history/i });
    expect(backLink).toHaveAttribute("href", "/customer/history");
  });

  it("shows Back to Track Parcel when redirected from track parcel page", async () => {
    render(<CustomerReceiptView trackingId="ND-TEST" from="track" />);
    await screen.findByRole("article");
    const backLink = screen.getByRole("link", { name: /back to track parcel/i });
    expect(backLink).toHaveAttribute("href", "/customer/track?id=ND-TEST");
  });
});
