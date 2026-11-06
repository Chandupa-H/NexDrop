"use client";

import { useState } from "react";
import type { MerchantOrder } from "../../types";
import { Button } from "@/components/ui/button";

interface CreateOrderTabProps {
  onOrderCreated: (newOrder: MerchantOrder) => void;
  onCancel: () => void;
}

export function CreateOrderTab({ onOrderCreated, onCancel }: CreateOrderTabProps) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("+94 ");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Colombo");
  const [weightKg, setWeightKg] = useState<number>(1.0);
  const [dimensions, setDimensions] = useState("20x15x10 cm");
  const [isCod, setIsCod] = useState(true);
  const [codAmount, setCodAmount] = useState<number>(3500);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dynamic fee calculation: Base LKR 350 + LKR 100/kg
  const estimatedDeliveryFee = 350 + Math.round(weightKg * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!recipientName.trim()) {
      setSubmitError("Please enter recipient name");
      return;
    }
    if (!recipientPhone.trim() || recipientPhone.length < 9) {
      setSubmitError("Please enter a valid phone number");
      return;
    }
    if (!deliveryAddress.trim()) {
      setSubmitError("Please enter delivery street address");
      return;
    }

    setIsSubmitting(true);

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const trackingNumber = `ND-LK-${randomSuffix}`;

    const newOrder: MerchantOrder = {
      id: `ord-${Date.now()}`,
      trackingNumber,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryCity,
      status: "created",
      weightKg: Number(weightKg) || 1.0,
      dimensions: dimensions.trim() || "Standard Parcel",
      codAmount: isCod ? Number(codAmount) || 0 : 0,
      isPrepaid: !isCod,
      estimatedDelivery: "Pending Courier Pickup",
      createdAt: new Date().toISOString(),
      specialInstructions: specialInstructions.trim() || undefined,
    };

    // Try sending to backend POST /parcels (non-blocking if backend is offline/different schema)
    try {
      await fetch("http://localhost:8000/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: newOrder.recipientName,
          recipient_phone: newOrder.recipientPhone,
          delivery_address: newOrder.deliveryAddress,
          delivery_city: newOrder.deliveryCity,
          weight_kg: newOrder.weightKg,
          dimensions: newOrder.dimensions,
          special_instructions: newOrder.specialInstructions,
          sender_id: 1,
        }),
      }).catch(() => {
        // graceful backend fallback
      });
    } catch {
      // offline fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderCreated(newOrder);
    }, 400);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#064E3B] tracking-tight">
              Create New Delivery Shipment
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Book a courier pickup or register an e-commerce order manually into the NexDrop dispatch network.
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-[#064E3B] font-semibold px-2.5 py-1 rounded-full">
            Auto-Dispatched
          </span>
        </div>

        {submitError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {submitError}
          </div>
        )}

        {/* Shipment Booking Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
          {/* Recipient Details */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-gray-500 text-[11px]">
              1. Recipient Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Recipient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+94 77 123 4567"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 45/2 Galle Road, Bambalapitiya"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  City / Zone <span className="text-red-500">*</span>
                </label>
                <select
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none bg-white"
                >
                  <option value="Colombo">Colombo (Western)</option>
                  <option value="Kandy">Kandy (Central)</option>
                  <option value="Galle">Galle (Southern)</option>
                  <option value="Negombo">Negombo (Gampaha)</option>
                  <option value="Kurunegala">Kurunegala (North Western)</option>
                  <option value="Jaffna">Jaffna (Northern)</option>
                  <option value="Batticaloa">Batticaloa (Eastern)</option>
                  <option value="Matara">Matara (Southern)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Parcel Specifications */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <h3 className="font-bold uppercase tracking-wider text-gray-500 text-[11px]">
              2. Package & Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0.1)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Dimensions (L x W x H cm)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20x15x10 cm"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Special Handling Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Fragile glassware, call customer before delivery"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none"
              />
            </div>
          </div>

          {/* Payment & COD Options */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <h3 className="font-bold uppercase tracking-wider text-gray-500 text-[11px]">
              3. Payment & Cash on Delivery (COD)
            </h3>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                <input
                  type="radio"
                  name="paymentType"
                  checked={isCod}
                  onChange={() => setIsCod(true)}
                  className="text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span>Cash on Delivery (COD)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                <input
                  type="radio"
                  name="paymentType"
                  checked={!isCod}
                  onChange={() => setIsCod(false)}
                  className="text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span>Prepaid Order</span>
              </label>
            </div>

            {isCod && (
              <div className="max-w-xs">
                <label className="block font-medium text-gray-700 mb-1">
                  COD Amount to Collect from Recipient (LKR)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={codAmount}
                  onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#064E3B] focus:outline-none font-semibold text-[#064E3B]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  NexDrop couriers collect this cash amount upon doorstep delivery.
                </p>
              </div>
            )}
          </div>

          {/* Delivery Fee Calculation Summary Box */}
          <div className="p-4 bg-[#F8FAF8] border border-[#E5E7EB] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 block">Estimated Island-wide Courier Fee</span>
              <strong className="text-lg font-bold text-[#064E3B]">
                LKR {estimatedDeliveryFee}.00
              </strong>
              <p className="text-[10px] text-gray-400">
                Includes insurance & live tracking. Debited from monthly merchant invoice.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="font-bold min-w-[140px]"
              >
                {isSubmitting ? "Dispatching..." : "Create Shipment →"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

