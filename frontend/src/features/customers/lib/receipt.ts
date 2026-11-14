/** A shipment receipt is available only after delivery; this does not imply payment. */
export function isCustomerReceiptEligible(status: string, trackingId: string): boolean {
  return status === "delivered" && !!trackingId?.trim();
}

/** The existing API supplies an estimate, not a confirmed payment amount. */
export function formatReceiptEstimate(fee: unknown): string {
  return typeof fee === "number" && Number.isFinite(fee) && fee >= 0
    ? `Rs. ${fee.toFixed(2)}`
    : "Not available";
}
