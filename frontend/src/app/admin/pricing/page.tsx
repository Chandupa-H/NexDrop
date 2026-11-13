"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { adminApi, type PricingTierDTO } from "@/features/admin/api/admin.api";
import {
  Check,
  Loader2,
  RefreshCw,
  Save,
  Zap,
} from "lucide-react";

export default function AdminPricingPage() {
  const [tiers, setTiers] = useState<PricingTierDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const loadTiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getPricingTiers();
      setTiers(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load pricing tiers from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTiers();
  }, []);

  const updateLocalField = (
    id: number,
    field: "base_rate" | "per_km_rate" | "per_kg_rate" | "is_active",
    value: number | boolean
  ) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTier = async (tier: PricingTierDTO) => {
    setSavingId(tier.id);
    try {
      await adminApi.updatePricingTier(tier.id, {
        base_rate: tier.base_rate,
        per_km_rate: tier.per_km_rate,
        per_kg_rate: tier.per_kg_rate,
        is_active: tier.is_active,
      });
      setSavedId(tier.id);
      setTimeout(() => setSavedId(null), 2500);
    } catch (err) {
      alert((err as Error).message || "Failed to update pricing tier");
    } finally {
      setSavingId(null);
    }
  };

  const standardTier = tiers[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Pricing Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Configure system delivery fees, distance-based tariffs, and weight-based pricing tiers stored in PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTiers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Configured Tiers</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">{loading ? "..." : tiers.length}</p>
          <p className="text-xs text-[#5b7266] mt-1">Database pricing rules</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Standard Base Fare</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading || !standardTier ? "..." : `Rs. ${standardTier.base_rate}`}
          </p>
          <p className="text-xs text-[#16a34a] mt-1">{standardTier?.name || "Primary tier"}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Standard Per-Km Rate</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading || !standardTier ? "..." : `Rs. ${standardTier.per_km_rate} / km`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Distance multiplier</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Standard Per-Kg Rate</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading || !standardTier ? "..." : `Rs. ${standardTier.per_kg_rate} / kg`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Weight surcharge</p>
        </div>
      </div>

      {/* Pricing Tiers List */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading pricing tiers...
        </div>
      ) : tiers.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#5b7266] bg-white rounded-2xl border border-[#e5eee8]">
          No pricing tiers found in database.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <SectionCard
              key={tier.id}
              title={tier.name}
              subtitle={`Tier ID #${tier.id}`}
              action={
                <Badge variant={tier.is_active ? "success" : "secondary"}>
                  {tier.is_active ? "Active" : "Inactive"}
                </Badge>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Base Delivery Fee (Rs.)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={tier.base_rate}
                    onChange={(e) =>
                      updateLocalField(tier.id, "base_rate", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Per-Kilometer Rate (Rs. / km)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={tier.per_km_rate}
                    onChange={(e) =>
                      updateLocalField(tier.id, "per_km_rate", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Per-Kilogram Rate (Rs. / kg)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={tier.per_kg_rate}
                    onChange={(e) =>
                      updateLocalField(tier.id, "per_kg_rate", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#0f2a1d] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tier.is_active}
                      onChange={(e) =>
                        updateLocalField(tier.id, "is_active", e.target.checked)
                      }
                      className="rounded border-[#e5eee8] text-[#16a34a] focus:ring-[#16a34a]"
                    />
                    Tier Enabled
                  </label>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savingId === tier.id}
                    onClick={() => handleSaveTier(tier)}
                    className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
                  >
                    {savedId === tier.id ? (
                      <>
                        <Check className="w-4 h-4 text-[#b6f36b]" /> Saved
                      </>
                    ) : savingId === tier.id ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Tier
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
        <div className="flex items-start gap-2.5 text-xs text-[#0b3d2a]">
          <Zap className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Live Pricing Engine Connected</p>
            <p className="text-[#5b7266] mt-0.5">
              Changes saved here immediately update the backend pricing estimator (`POST /api/v1/pricing/estimate`) stored in the `pricing_tiers` database table.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
