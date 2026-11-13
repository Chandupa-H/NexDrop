"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { adminApi, type PricingTierDTO } from "@/features/admin/api/admin.api";
import { getPricingRules, updatePricingRules } from "@/features/admin/api/pricing.api";
import {
  PricingConfirmModal,
  type PricingChangeItem,
} from "@/features/admin/components/PricingConfirmModal";
import {
  AlertCircle,
  Check,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

export default function AdminPricingPage() {
  const [activeTab, setActiveTab] = useState<"tiers" | "rules">("tiers");

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 1: Database Pricing Tiers (Admin Branch Standard)
  // ─────────────────────────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<PricingTierDTO[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [tierError, setTierError] = useState<string | null>(null);
  const [savingTierId, setSavingTierId] = useState<number | null>(null);
  const [savedTierId, setSavedTierId] = useState<number | null>(null);

  const loadTiers = async () => {
    setLoadingTiers(true);
    setTierError(null);
    try {
      const data = await adminApi.getPricingTiers();
      setTiers(data);
    } catch (err) {
      setTierError((err as Error).message || "Failed to load pricing tiers from database");
    } finally {
      setLoadingTiers(false);
    }
  };

  useEffect(() => {
    loadTiers();
  }, []);

  const updateLocalTierField = (
    id: number,
    field: "base_rate" | "per_km_rate" | "per_kg_rate" | "is_active",
    value: number | boolean
  ) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTier = async (tier: PricingTierDTO) => {
    setSavingTierId(tier.id);
    try {
      await adminApi.updatePricingTier(tier.id, {
        base_rate: tier.base_rate,
        per_km_rate: tier.per_km_rate,
        per_kg_rate: tier.per_kg_rate,
        is_active: tier.is_active,
      });
      setSavedTierId(tier.id);
      setTimeout(() => setSavedTierId(null), 2500);
    } catch (err) {
      alert((err as Error).message || "Failed to update pricing tier");
    } finally {
      setSavingTierId(null);
    }
  };

  const standardTier = tiers[0];

  // ─────────────────────────────────────────────────────────────────────────────
  // Tab 2: Global Tariffs & Dynamic Surge Multipliers (Pricing Branch Feature)
  // ─────────────────────────────────────────────────────────────────────────────
  const [baseFare, setBaseFare] = useState("350.00");
  const [perKmRate, setPerKmRate] = useState("120.00");
  const [expressSurcharge, setExpressSurcharge] = useState("250.00");
  const [peakSurgeMax, setPeakSurgeMax] = useState("1.50");
  const [rainSurge, setRainSurge] = useState("1.30");

  const [initialRules, setInitialRules] = useState({
    baseFare: "350.00",
    perKmRate: "120.00",
    expressSurcharge: "250.00",
    peakSurgeMax: "1.50",
    rainSurge: "1.30",
  });

  const [loadingRules, setLoadingRules] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [savedRules, setSavedRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadRules = async () => {
    try {
      setLoadingRules(true);
      setRulesError(null);
      const data = await getPricingRules();
      if (data) {
        const loaded = {
          baseFare: Number(data.base_fare).toFixed(2),
          perKmRate: Number(data.per_km_rate).toFixed(2),
          expressSurcharge: Number(data.express_surcharge).toFixed(2),
          peakSurgeMax: Number(data.peak_surge_max).toFixed(2),
          rainSurge: Number(data.rain_surge).toFixed(2),
        };
        setBaseFare(loaded.baseFare);
        setPerKmRate(loaded.perKmRate);
        setExpressSurcharge(loaded.expressSurcharge);
        setPeakSurgeMax(loaded.peakSurgeMax);
        setRainSurge(loaded.rainSurge);
        setInitialRules(loaded);
      }
    } catch (err) {
      setRulesError((err as Error).message || "Failed to load pricing rules from backend.");
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const detectedChanges: PricingChangeItem[] = [];

  if (parseFloat(baseFare || "0") !== parseFloat(initialRules.baseFare)) {
    detectedChanges.push({
      label: "Base Delivery Fee",
      oldValue: `Rs. ${initialRules.baseFare}`,
      newValue: `Rs. ${parseFloat(baseFare || "0").toFixed(2)}`,
    });
  }

  if (parseFloat(perKmRate || "0") !== parseFloat(initialRules.perKmRate)) {
    detectedChanges.push({
      label: "Per-Kilometer Distance Rate",
      oldValue: `Rs. ${initialRules.perKmRate} / km`,
      newValue: `Rs. ${parseFloat(perKmRate || "0").toFixed(2)} / km`,
    });
  }

  if (parseFloat(expressSurcharge || "0") !== parseFloat(initialRules.expressSurcharge)) {
    detectedChanges.push({
      label: "Express Priority Surcharge",
      oldValue: `Rs. ${initialRules.expressSurcharge}`,
      newValue: `Rs. ${parseFloat(expressSurcharge || "0").toFixed(2)}`,
    });
  }

  if (parseFloat(peakSurgeMax || "1") !== parseFloat(initialRules.peakSurgeMax)) {
    detectedChanges.push({
      label: "Peak Demand Max Multiplier",
      oldValue: `${initialRules.peakSurgeMax}x`,
      newValue: `${parseFloat(peakSurgeMax || "1").toFixed(2)}x`,
    });
  }

  if (parseFloat(rainSurge || "1") !== parseFloat(initialRules.rainSurge)) {
    detectedChanges.push({
      label: "Inclement Weather / Rain Multiplier",
      oldValue: `${initialRules.rainSurge}x`,
      newValue: `${parseFloat(rainSurge || "1").toFixed(2)}x`,
    });
  }

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setSavingRules(true);
    setRulesError(null);
    try {
      await updatePricingRules({
        base_fare: parseFloat(baseFare),
        per_km_rate: parseFloat(perKmRate),
        express_surcharge: parseFloat(expressSurcharge),
        peak_surge_max: parseFloat(peakSurgeMax),
        rain_surge: parseFloat(rainSurge),
      });

      setInitialRules({
        baseFare: parseFloat(baseFare).toFixed(2),
        perKmRate: parseFloat(perKmRate).toFixed(2),
        expressSurcharge: parseFloat(expressSurcharge).toFixed(2),
        peakSurgeMax: parseFloat(peakSurgeMax).toFixed(2),
        rainSurge: parseFloat(rainSurge).toFixed(2),
      });

      setSavedRules(true);
      setShowConfirmModal(false);
      setTimeout(() => setSavedRules(false), 3000);
      loadTiers(); // Sync tiers view
    } catch (err) {
      setRulesError((err as Error).message || "Failed to update pricing rules.");
      setShowConfirmModal(false);
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="space-y-6">
      <PricingConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSave}
        isSaving={savingRules}
        changes={detectedChanges}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Pricing Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Configure system delivery fees, distance-based tariffs, surcharges, and database pricing tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "tiers" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={loadTiers}
              disabled={loadingTiers}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTiers ? "animate-spin" : ""}`} /> Refresh Tiers
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenConfirm}
              disabled={savingRules || loadingRules}
              className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35] text-white"
            >
              {savingRules ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : savedRules ? (
                <>
                  <Check className="w-4 h-4 text-[#b6f36b]" /> Rates Updated
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Pricing Rules
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-[#e5eee8] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("tiers")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-[1px] ${
            activeTab === "tiers"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0f2a1d]"
          }`}
        >
          <Layers className="w-4 h-4" /> Delivery Tiers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-[1px] ${
            activeTab === "rules"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0f2a1d]"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Global Tariffs & Surge Rules
          {detectedChanges.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {detectedChanges.length}
            </span>
          )}
        </button>
      </div>

      {/* Errors */}
      {tierError && activeTab === "tiers" && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {tierError}
        </div>
      )}
      {rulesError && activeTab === "rules" && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{rulesError}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Configured Tiers</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">{loadingTiers ? "..." : tiers.length}</p>
          <p className="text-xs text-[#5b7266] mt-1">Database pricing rules</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Standard Base Fare</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loadingTiers || !standardTier ? `Rs. ${baseFare}` : `Rs. ${standardTier.base_rate}`}
          </p>
          <p className="text-xs text-[#16a34a] mt-1">{standardTier?.name || "Primary tier"}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Standard Per-Km Rate</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loadingTiers || !standardTier ? `Rs. ${perKmRate} / km` : `Rs. ${standardTier.per_km_rate} / km`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Distance multiplier</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Max Dynamic Surge</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {loadingRules ? "..." : `${peakSurgeMax}x`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Platform protective cap</p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Tab 1 Content: Pricing Tiers Grid (Admin Branch)                  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === "tiers" && (
        <>
          {loadingTiers ? (
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
                          updateLocalTierField(tier.id, "base_rate", parseFloat(e.target.value) || 0)
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
                          updateLocalTierField(tier.id, "per_km_rate", parseFloat(e.target.value) || 0)
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
                          updateLocalTierField(tier.id, "per_kg_rate", parseFloat(e.target.value) || 0)
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
                            updateLocalTierField(tier.id, "is_active", e.target.checked)
                          }
                          className="rounded border-[#e5eee8] text-[#16a34a] focus:ring-[#16a34a]"
                        />
                        Tier Enabled
                      </label>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={savingTierId === tier.id}
                        onClick={() => handleSaveTier(tier)}
                        className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
                      >
                        {savedTierId === tier.id ? (
                          <>
                            <Check className="w-4 h-4 text-[#b6f36b]" /> Saved
                          </>
                        ) : savingTierId === tier.id ? (
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
        </>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Tab 2 Content: Global Tariffs & Surge Rules (Pricing Branch)      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Base Tariffs */}
          <SectionCard
            title="Base Tariffs & Distance Tiers"
            subtitle="Configure default courier base rate matrix"
          >
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                  Base Delivery Fee (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#5b7266]">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="10.00"
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
                <p className="text-[11px] text-[#5b7266] mt-1">Covers parcel pickup and initial 2.0 kilometers.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                  Per-Kilometer Distance Rate (Rs./km)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#5b7266]">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="5.00"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
                <p className="text-[11px] text-[#5b7266] mt-1">Standard incremental rate per kilometer beyond 2.0 km.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                  Express Priority Surcharge (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#5b7266]">
                    Rs.
                  </span>
                  <input
                    type="number"
                    step="25.00"
                    value={expressSurcharge}
                    onChange={(e) => setExpressSurcharge(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
                <p className="text-[11px] text-[#5b7266] mt-1">Direct point-to-point priority dispatch without batching.</p>
              </div>
            </div>
          </SectionCard>

          {/* Dynamic Surge Rules */}
          <SectionCard
            title="Dynamic Surge & Weather Triggers"
            subtitle="Automatic multipliers based on demand imbalance and weather"
          >
            <div className="space-y-4 pt-1">
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
                <p className="text-[11px] text-[#5b7266] mt-1">Compensates couriers during heavy downpours.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                <div className="flex items-start gap-2 text-xs text-[#0b3d2a]">
                  <Zap className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Automated Surge Engine:</span> Multipliers dynamically adjust instant customer checkout pricing based on real-time fleet density.
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Database Connection Notice */}
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
