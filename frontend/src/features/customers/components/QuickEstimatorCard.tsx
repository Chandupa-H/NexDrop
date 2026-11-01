"use client";

import { useState, useEffect } from "react";
import { SectionCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Calculator, Truck, ArrowRight, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";

interface CityDistance {
  city: string;
  distanceKm: number;
}

const SRI_LANKA_DESTINATIONS: CityDistance[] = [
  { city: "Colombo Local (Same-Day)", distanceKm: 12 },
  { city: "Greater Colombo / Gampaha", distanceKm: 28 },
  { city: "Kandy (Central Province)", distanceKm: 115 },
  { city: "Galle (Southern Province)", distanceKm: 125 },
  { city: "Matara (Southern Province)", distanceKm: 160 },
  { city: "Kurunegala (North Western)", distanceKm: 95 },
  { city: "Jaffna (Northern Province)", distanceKm: 395 },
];

export function QuickEstimatorCard() {
  const [selectedCity, setSelectedCity] = useState(SRI_LANKA_DESTINATIONS[0].city);
  const [weightKg, setWeightKg] = useState(1.0);
  const [estimatedCost, setEstimatedCost] = useState<number>(380);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const dest = SRI_LANKA_DESTINATIONS.find((d) => d.city === selectedCity);
    const distanceKm = dest ? dest.distanceKm : 15;

    async function compute() {
      try {
        setLoading(true);
        const res = await apiClient.getPricingEstimate({
          distance_km: distanceKm,
          weight_kg: weightKg,
        });
        if (active) {
          // Multiply total_price or convert to LKR standard tier
          const lkrFee = Math.max(250, Math.round(res.total_price * 15));
          setEstimatedCost(lkrFee);
        }
      } catch {
        if (active) {
          // Fallback formula
          const base = 250;
          const cost = base + distanceKm * 3.5 + weightKg * 80;
          setEstimatedCost(Math.round(cost));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      compute();
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedCity, weightKg]);

  return (
    <SectionCard
      title="Instant Rate Estimator"
      subtitle="Preview delivery fees before creating a shipment"
      action={
        <div className="p-1 rounded-md text-[var(--dashboard-primary)]">
          <Calculator className="h-4 w-4" />
        </div>
      }
    >
      <div className="space-y-4">
        {/* City selection */}
        <div>
          <label className="text-xs font-medium text-[var(--dashboard-muted)] block mb-1">
            Destination Hub
          </label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full text-xs sm:text-sm p-2 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
          >
            {SRI_LANKA_DESTINATIONS.map((d) => (
              <option key={d.city} value={d.city}>
                {d.city}
              </option>
            ))}
          </select>
        </div>

        {/* Weight input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-[var(--dashboard-muted)]">
              Parcel Weight
            </label>
            <span className="text-xs font-bold text-[var(--dashboard-text)]">
              {weightKg.toFixed(1)} kg
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="15"
            step="0.5"
            value={weightKg}
            onChange={(e) => setWeightKg(parseFloat(e.target.value))}
            className="w-full accent-[var(--dashboard-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--dashboard-muted)]">
            <span>0.5 kg (Document)</span>
            <span>5 kg (Box)</span>
            <span>15 kg (Heavy)</span>
          </div>
        </div>

        {/* Result banner */}
        <div className="p-3.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[var(--dashboard-muted)] block">
              Estimated Rate
            </span>
            <div className="text-lg font-bold text-[var(--dashboard-deep-green)]">
              {loading ? (
                <span className="text-xs font-normal text-[var(--dashboard-muted)] animate-pulse">
                  Calculating...
                </span>
              ) : (
                `Rs. ${estimatedCost.toFixed(2)}`
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--dashboard-success-text)] font-medium">
              <CheckCircle2 className="h-3 w-3" /> Includes Insurance
            </span>
            <p className="text-[10px] text-[var(--dashboard-muted)]">No hidden taxes</p>
          </div>
        </div>

        {/* Action button */}
        <Button
          className="w-full bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white font-medium text-xs sm:text-sm h-10 gap-1.5 shadow-sm"
          onClick={() => {
            alert("Booking feature is planned for the upcoming release.");
          }}
        >
          <Truck className="h-4 w-4" />
          Book Delivery with This Rate
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </Button>
      </div>
    </SectionCard>
  );
}
