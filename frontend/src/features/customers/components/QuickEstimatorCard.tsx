"use client";

import { useState, useEffect, useRef } from "react";
import { SectionCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { Calculator, Truck, ArrowRight, CheckCircle2, X, RotateCcw, Info } from "lucide-react";
import apiClient from "@/lib/api-client";
import { SRI_LANKA_HUBS } from "../constants/destinations";

interface HubOption {
  city: string;
  label: string;
  distanceKm: number;
}

const SRI_LANKA_DESTINATIONS: HubOption[] = SRI_LANKA_HUBS.map((h) => {
  let label = `${h.city} (${h.province} Province)`;
  if (h.city === "Colombo Local") label = "Colombo Local (Same-Day)";
  else if (h.city === "Greater Colombo / Gampaha") label = "Greater Colombo / Gampaha";
  else if (h.province === "North Western") label = `${h.city} (North Western)`;
  else if (h.province === "North Central") label = `${h.city} (North Central)`;
  else if (h.province === "Sabaragamuwa") label = `${h.city} (Sabaragamuwa)`;
  return {
    city: h.city,
    label,
    distanceKm: h.distanceKm,
  };
});

export function QuickEstimatorCard() {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [weightKg, setWeightKg] = useState<number>(1.0);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const dest = selectedCity
    ? SRI_LANKA_DESTINATIONS.find((d) => d.city === selectedCity)
    : undefined;
  const distanceKm = dest ? dest.distanceKm : 0;
  const baseRate = 250;
  const distanceCharge = Math.round(distanceKm * 3.5);
  const weightCharge = Math.round(weightKg * 80);

  // Close breakdown popover on click outside or Escape key
  useEffect(() => {
    if (!showBreakdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowBreakdown(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowBreakdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showBreakdown]);

  useEffect(() => {
    let active = true;

    async function compute() {
      if (!selectedCity) {
        setEstimatedCost(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await apiClient.getPricingEstimate({
          distance_km: distanceKm,
          weight_kg: weightKg,
        });
        if (active) {
          const lkrFee = Math.max(250, Math.round(res.total_price * 15));
          setEstimatedCost(lkrFee);
        }
      } catch {
        if (active) {
          const cost = baseRate + distanceCharge + weightCharge;
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
  }, [selectedCity, weightKg, distanceKm, distanceCharge, weightCharge]);

  const handleReset = () => {
    setSelectedCity("");
    setWeightKg(1.0);
    setEstimatedCost(null);
    setShowBreakdown(false);
  };

  const handleBookWithRate = () => {
    if (!selectedCity) return;
    const chosenCity = selectedCity;
    const chosenWeight = weightKg.toFixed(1);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("nexdrop_estimator_destination", chosenCity);
        sessionStorage.setItem("nexdrop_estimator_weight", chosenWeight);
      } catch {
        // ignore
      }
    }

    const params = new URLSearchParams({
      destination: chosenCity,
      weight: chosenWeight,
    });

    window.location.href = `/customer/book?${params.toString()}`;
  };

  return (
    <SectionCard
      title="Instant Rate Estimator"
      subtitle="Preview delivery fees across Sri Lankan hubs before creating a shipment"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset rate estimator to defaults"
            title="Reset destination and weight to defaults"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] hover:bg-[var(--dashboard-control-bg)] text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] text-sm font-semibold cursor-pointer transition-colors shadow-2xs"
          >
            <RotateCcw className="h-4 w-4 text-[var(--dashboard-primary)]" />
            <span>Reset</span>
          </button>

          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              disabled={!selectedCity}
              aria-label="View rate breakdown and calculation formula"
              title={selectedCity ? "Click to view rate breakdown" : "Select a destination hub to view breakdown"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] hover:bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)] text-sm font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Rate Breakdown</span>
            </button>

            {/* Breakdown Popover */}
            {showBreakdown && (
              <div
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] p-4 shadow-xl z-50 animate-in fade-in"
                role="dialog"
                aria-modal="true"
                aria-label="Rate calculation breakdown"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--dashboard-hairline)]">
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-[var(--dashboard-text)]">
                    <Calculator className="h-4 w-4 text-[var(--dashboard-primary)]" />
                    Rate Formula Breakdown
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBreakdown(false)}
                    className="p-1 rounded-md text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)] transition-colors cursor-pointer"
                    aria-label="Close popover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--dashboard-muted)]">
                    <span>Base Pickup & Booking Fee</span>
                    <span className="font-medium text-[var(--dashboard-text)]">
                      Rs. {baseRate.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--dashboard-muted)]">
                    <span>
                      Distance ({distanceKm} km @ Rs. 3.50/km)
                    </span>
                    <span className="font-medium text-[var(--dashboard-text)]">
                      Rs. {distanceCharge.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--dashboard-muted)]">
                    <span>
                      Weight ({weightKg.toFixed(1)} kg @ Rs. 80/kg)
                    </span>
                    <span className="font-medium text-[var(--dashboard-text)]">
                      Rs. {weightCharge.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--dashboard-muted)]">
                    <span className="flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-[var(--dashboard-success-text)]" />
                      Standard Goods Insurance
                    </span>
                    <span className="font-medium text-[var(--dashboard-success-text)]">
                      Free (Rs. 0.00)
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[var(--dashboard-hairline)] flex justify-between font-bold text-sm text-[var(--dashboard-deep-green)]">
                    <span>Total Estimated Fee</span>
                    <span>{estimatedCost !== null ? `Rs. ${estimatedCost.toFixed(2)}` : "-"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
        {/* Destination selection */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-sm font-medium text-[var(--dashboard-muted)] block">
            Destination Hub
          </label>
          <ThemedSelect
            value={selectedCity}
            onChange={setSelectedCity}
            placeholder="Select Destination Hub..."
            options={SRI_LANKA_DESTINATIONS.map((d) => ({
              value: d.city,
              label: d.label,
            }))}
          />
        </div>

        {/* Weight input */}
        <div className="lg:col-span-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--dashboard-muted)]">
              Parcel Weight
            </label>
            <span className="text-sm font-bold text-[var(--dashboard-text)]">
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
          <div className="flex justify-between text-sm text-[var(--dashboard-muted)]">
            <span>0.5 kg (Document)</span>
            <span>15 kg (Heavy)</span>
          </div>
        </div>

        {/* Result banner & Action CTA */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="p-3 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[var(--dashboard-muted)] block">
                Estimated Rate
              </span>
              <div className="text-lg font-bold text-[var(--dashboard-deep-green)]">
                {loading ? (
                  <span className="text-sm font-normal text-[var(--dashboard-muted)] animate-pulse">
                    Calculating...
                  </span>
                ) : estimatedCost !== null ? (
                  `Rs. ${estimatedCost.toFixed(2)}`
                ) : (
                  <span className="text-sm font-normal text-[var(--dashboard-muted)]">
                    Select destination
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-sm text-[var(--dashboard-success-text)] font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Includes Insurance
              </span>
              <p className="text-sm text-[var(--dashboard-muted)] mt-0.5">No hidden taxes</p>
            </div>
          </div>

          <Button
            className="w-full bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white font-semibold text-sm h-10 gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBookWithRate}
            disabled={!selectedCity}
          >
            <Truck className="h-4 w-4" />
            Book Delivery with This Rate
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
