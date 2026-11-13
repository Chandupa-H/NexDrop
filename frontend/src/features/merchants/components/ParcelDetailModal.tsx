"use client";

import { useState } from "react";
import { Printer, Phone, MapPin, Truck, FileText, Package } from "lucide-react";
import type { MerchantOrder } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ParcelDetailModalProps {
  order: MerchantOrder | null;
  onClose: () => void;
  merchantName?: string;
  merchantAddress?: string;
}

export function ParcelDetailModal({
  order,
  onClose,
  merchantName,
  merchantAddress,
}: ParcelDetailModalProps) {
  const [showReceipt, setShowReceipt] = useState(false);

  if (!order) return null;

  // Timeline steps
  const steps = [
    { key: "created", label: "Order Created", desc: "Order details received in system" },
    { key: "picked_up", label: "Picked Up", desc: "Courier collected parcel from merchant" },
    { key: "in_transit", label: "In Transit", desc: "Parcel processed at central hub" },
    { key: "out_for_delivery", label: "Out for Delivery", desc: "Courier on route to destination" },
    {
      key: order.status === "failed" ? "failed" : "delivered",
      label: order.status === "failed" ? "Delivery Failed" : "Delivered",
      desc:
        order.status === "failed"
          ? order.failureReason || "Unsuccessful attempt"
          : "Handed over to recipient",
    },
  ];

  const getStepState = (stepKey: string) => {
    const orderLevels: Record<string, number> = {
      created: 1,
      in_transit: 3,
      out_for_delivery: 4,
      delivered: 5,
      failed: 5,
    };

    const currentLevel = orderLevels[order.status] ?? 1;
    const stepLevels: Record<string, number> = {
      created: 1,
      picked_up: 2,
      in_transit: 3,
      out_for_delivery: 4,
      delivered: 5,
      failed: 5,
    };

    const thisLevel = stepLevels[stepKey] ?? 1;

    if (order.status === "failed" && stepKey === "failed") return "failed";
    if (thisLevel < currentLevel) return "completed";
    if (thisLevel === currentLevel) return "active";
    return "pending";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#064E3B] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-[#A3E635]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-wider text-white">
                  {order.trackingNumber}
                </span>
                <Badge variant={order.status} className="capitalize">
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Created {new Date(order.createdAt).toLocaleDateString()} · {order.deliveryCity}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/80 hover:text-white rounded-lg p-1.5 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {showReceipt ? (
            /* Printable Delivery Receipt View */
            <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-6 space-y-5 print:p-0 print:border-none">
              <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-4">
                <div>
                  <h3 className="font-extrabold text-xl text-[#064E3B] tracking-tight">NexDrop Official Delivery Receipt</h3>
                  <p className="text-xs text-[#64748B]">Automated Island-wide Courier Management</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-[#064E3B]">{order.trackingNumber}</p>
                  <p className="text-xs text-[#64748B]">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#64748B] block">Sender / Merchant</span>
                  <strong className="text-[#064E3B] text-sm">
                    {merchantName || "NexDrop Merchant Partner"}
                  </strong>
                  <p className="text-gray-600">
                    {merchantAddress || "Colombo, Sri Lanka"}
                  </p>
                </div>
                <div>
                  <span className="text-[#64748B] block">Recipient</span>
                  <strong className="text-gray-900 text-sm">{order.recipientName}</strong>
                  <p className="text-gray-600">{order.recipientPhone}</p>
                  <p className="text-gray-600">{order.deliveryAddress}, {order.deliveryCity}</p>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white text-xs">
                <div className="bg-gray-50 font-semibold px-4 py-2 border-b border-[#E5E7EB] flex justify-between">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Standard Island-wide Courier ({order.weightKg} kg)</span>
                    <span>LKR {Math.round(350 + order.weightKg * 100)}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handling & Packaging ({order.dimensions || "Medium Box"})</span>
                    <span>LKR 150.00</span>
                  </div>
                  {order.codAmount > 0 && (
                    <div className="flex justify-between font-semibold text-[#064E3B] pt-2 border-t border-dashed">
                      <span>Cash on Delivery (COD) to Collect</span>
                      <span>LKR {order.codAmount.toLocaleString()}.00</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceipt(false)}
                >
                  ← Back to Tracking View
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Tracking View */
            <>
              {/* Progress Milestones Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#064E3B] mb-4">
                  Shipment Tracking Lifecycle
                </h4>
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
                  {steps.map((st) => {
                    const state = getStepState(st.key);
                    const isCompleted = state === "completed";
                    const isActive = state === "active";
                    const isFailed = state === "failed";

                    let dotClass = "bg-gray-300 text-gray-500";
                    if (isCompleted) dotClass = "bg-[#16A34A] text-white";
                    if (isActive) dotClass = "bg-[#064E3B] ring-4 ring-emerald-100 text-white";
                    if (isFailed) dotClass = "bg-red-600 ring-4 ring-red-100 text-white";

                    return (
                      <div key={st.key} className="relative flex items-start gap-3">
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${dotClass}`}
                        >
                          {isCompleted ? "✓" : isFailed ? "✕" : "•"}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              isActive || isCompleted
                                ? "text-[#064E3B]"
                                : isFailed
                                ? "text-red-700 font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            {st.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{st.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recipient & Package Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold uppercase text-[#064E3B] tracking-wider">
                    Recipient Information
                  </span>
                  <div className="text-xs space-y-1 text-gray-700">
                    <p className="font-semibold text-sm text-gray-900">{order.recipientName}</p>
                    <p className="text-gray-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{order.recipientPhone}</span>
                    </p>
                    <p className="text-gray-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{order.deliveryAddress}</span>
                    </p>
                    <p className="font-medium text-[#064E3B]">{order.deliveryCity}</p>
                  </div>
                </div>

                <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold uppercase text-[#064E3B] tracking-wider">
                    Package & Remittance
                  </span>
                  <div className="text-xs space-y-1.5 text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Weight:</span>
                      <strong className="text-gray-900">{order.weightKg} kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dimensions:</span>
                      <span className="text-gray-800">{order.dimensions || "Standard Parcel"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment Mode:</span>
                      <span className="font-semibold text-[#064E3B]">
                        {order.codAmount > 0 ? `COD: LKR ${order.codAmount.toLocaleString()}` : "Prepaid"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estimated Delivery:</span>
                      <span className="text-emerald-800 font-medium">{order.estimatedDelivery}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Courier if available */}
              {order.courierName && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#064E3B] text-white flex items-center justify-center font-bold">
                      <Truck className="w-4 h-4 text-[#A3E635]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#064E3B]">Assigned Courier: {order.courierName}</p>
                      <p className="text-[#64748B]">Contact: {order.courierPhone}</p>
                    </div>
                  </div>
                  <Badge variant="in_transit">Active Route</Badge>
                </div>
              )}

              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Special Instructions:</strong> {order.specialInstructions}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#F8FAF8] border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          {!showReceipt && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReceipt(true)}
              className="text-[#064E3B] font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Delivery Receipt</span>
            </Button>
          )}

          <div className="ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

