"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Check, 
  DollarSign, 
  HelpCircle, 
  Percent, 
  Save, 
  Sliders, 
  Truck, 
  Zap 
} from "lucide-react";

export default function AdminPricingPage() {
  const [baseFare, setBaseFare] = useState("3.50");
  const [perKmRate, setPerKmRate] = useState("1.20");
  const [expressSurcharge, setExpressSurcharge] = useState("2.50");
  const [peakSurgeMax, setPeakSurgeMax] = useState("1.50");
  const [rainSurge, setRainSurge] = useState("1.30");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Pricing Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Configure system delivery fees, distance-based tariffs, parcel size surcharges, and dynamic surge algorithms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-[#b6f36b]" /> Rates Updated
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Pricing Rules
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Platform Base Fare</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">${baseFare}</p>
          <p className="text-xs text-[#5b7266] mt-1">First 2.0 km included</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Standard Per-Km Rate</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">${perKmRate} / km</p>
          <p className="text-xs text-[#16a34a] mt-1">Applied after base distance</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Express Priority Addon</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">+${expressSurcharge}</p>
          <p className="text-xs text-[#5b7266] mt-1">&lt;30 minute SLA guarantee</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Max Dynamic Surge</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{peakSurgeMax}x</p>
          <p className="text-xs text-[#5b7266] mt-1">Platform protective cap</p>
        </div>
      </div>

      {/* Pricing Form Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Base & Distance Rates */}
        <SectionCard
          title="Base Tariffs & Distance Tiers"
          subtitle="Configure default consumer & merchant courier rate matrix"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Base Delivery Fee (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5b7266]">$</span>
                <input
                  type="number"
                  step="0.10"
                  value={baseFare}
                  onChange={(e) => setBaseFare(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
              <p className="text-[11px] text-[#5b7266] mt-1">Covers parcel pickup and initial 2.0 kilometers.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Per-Kilometer Distance Rate (USD/km)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5b7266]">$</span>
                <input
                  type="number"
                  step="0.05"
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
              <p className="text-[11px] text-[#5b7266] mt-1">Computed by shortest Google Maps route trajectory.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Express Priority Surcharge (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5b7266]">$</span>
                <input
                  type="number"
                  step="0.50"
                  value={expressSurcharge}
                  onChange={(e) => setExpressSurcharge(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
              <p className="text-[11px] text-[#5b7266] mt-1">Direct point-to-point dispatch without batching.</p>
            </div>
          </div>
        </SectionCard>

        {/* Right Column: Surge & Dynamic Multipliers */}
        <SectionCard
          title="Dynamic Surge & Weather Triggers"
          subtitle="Automatic multipliers based on demand imbalance and weather"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Peak Demand Max Multiplier
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={peakSurgeMax}
                  onChange={(e) => setPeakSurgeMax(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5b7266]">x</span>
              </div>
              <p className="text-[11px] text-[#5b7266] mt-1">Triggers when active parcel queue exceeds courier capacity by 3x.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Inclement Weather / Rain Multiplier
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={rainSurge}
                  onChange={(e) => setRainSurge(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5b7266]">x</span>
              </div>
              <p className="text-[11px] text-[#5b7266] mt-1">Compensates couriers during heavy tropical downpours.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-start gap-2 text-xs text-[#0b3d2a]">
                <Zap className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Algorithmic Surge Protection Active</p>
                  <p className="text-[#5b7266] mt-0.5">
                    Surge prices adjust gradually at max 0.1x steps per 10-minute interval to prevent sudden checkout price jumps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
