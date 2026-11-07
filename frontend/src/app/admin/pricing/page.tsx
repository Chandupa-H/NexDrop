"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Check, 
  Save, 
  Zap,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { getPricingRules, updatePricingRules } from "@/features/admin/api/pricing.api";
import type { AdminPricingRulesDTO } from "@/features/admin/api/pricing.dto";

export default function AdminPricingPage() {
  const [baseFare, setBaseFare] = useState("350.00");
  const [perKmRate, setPerKmRate] = useState("120.00");
  const [expressSurcharge, setExpressSurcharge] = useState("250.00");
  const [peakSurgeMax, setPeakSurgeMax] = useState("1.50");
  const [rainSurge, setRainSurge] = useState("1.30");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial rules from backend
  useEffect(() => {
    let isMounted = true;
    async function loadRules() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPricingRules();
        if (isMounted && data) {
          setBaseFare(Number(data.base_fare).toFixed(2));
          setPerKmRate(Number(data.per_km_rate).toFixed(2));
          setExpressSurcharge(Number(data.express_surcharge).toFixed(2));
          setPeakSurgeMax(Number(data.peak_surge_max).toFixed(2));
          setRainSurge(Number(data.rain_surge).toFixed(2));
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message || "Failed to load pricing rules from backend.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadRules();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = {
        base_fare: parseFloat(baseFare) || 0,
        per_km_rate: parseFloat(perKmRate) || 0,
        express_surcharge: parseFloat(expressSurcharge) || 0,
        peak_surge_max: parseFloat(peakSurgeMax) || 1.0,
        rain_surge: parseFloat(rainSurge) || 1.0,
      };

      const updated = await updatePricingRules(payload);
      if (updated) {
        setBaseFare(Number(updated.base_fare).toFixed(2));
        setPerKmRate(Number(updated.per_km_rate).toFixed(2));
        setExpressSurcharge(Number(updated.express_surcharge).toFixed(2));
        setPeakSurgeMax(Number(updated.peak_surge_max).toFixed(2));
        setRainSurge(Number(updated.rain_surge).toFixed(2));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message || "Failed to save pricing rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pricing Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure system delivery fees, distance-based tariffs, surcharges, and dynamic surge multipliers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35] text-white"
          >
            {saving ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : saved ? (
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
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Platform Base Fare</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            Rs. {loading ? "..." : baseFare}
          </p>
          <p className="text-xs text-slate-400 mt-1">First 2.0 km included</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Standard Per-Km Rate</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            Rs. {loading ? "..." : perKmRate} / km
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Applied after base distance</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Express Priority Addon</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            +Rs. {loading ? "..." : expressSurcharge}
          </p>
          <p className="text-xs text-slate-400 mt-1">Priority SLA dispatch</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Max Dynamic Surge</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {loading ? "..." : `${peakSurgeMax}x`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Platform protective cap</p>
        </div>
      </div>

      {/* Pricing Form Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Base & Distance Rates */}
        <SectionCard
          title="Base Tariffs & Distance Tiers"
          subtitle="Configure default courier base rate matrix"
        >
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Base Delivery Fee (Rs.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  step="10.00"
                  value={baseFare}
                  onChange={(e) => setBaseFare(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Covers parcel pickup and initial 2.0 kilometers.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Per-Kilometer Distance Rate (Rs./km)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  step="5.00"
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Standard incremental rate per kilometer beyond 2.0 km.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Express Priority Surcharge (Rs.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  step="25.00"
                  value={expressSurcharge}
                  onChange={(e) => setExpressSurcharge(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Direct point-to-point dispatch without batching.</p>
            </div>
          </div>
        </SectionCard>

        {/* Right Column: Surge & Dynamic Multipliers */}
        <SectionCard
          title="Dynamic Surge & Weather Triggers"
          subtitle="Automatic multipliers based on demand imbalance and weather"
        >
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Peak Demand Max Multiplier
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={peakSurgeMax}
                  onChange={(e) => setPeakSurgeMax(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">x</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Triggers when active parcel queue exceeds courier capacity by 3x.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Inclement Weather / Rain Multiplier
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={rainSurge}
                  onChange={(e) => setRainSurge(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">x</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Compensates couriers during heavy rain or monsoon conditions.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-start gap-2.5 text-xs text-emerald-950">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900">Algorithmic Surge Protection Active</p>
                  <p className="text-emerald-700/80 mt-0.5 leading-relaxed">
                    Surge prices adjust gradually at maximum 0.1x increments per 10-minute interval to prevent sudden checkout price jumps.
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
