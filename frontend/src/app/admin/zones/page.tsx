"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, type DeliveryZoneDTO } from "@/features/admin/api/admin.api";
import {
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";

export default function AdminDeliveryZonesPage() {
  const [zonesList, setZonesList] = useState<DeliveryZoneDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New zone form state
  const [newZone, setNewZone] = useState({
    name: "",
    code: "",
    postcodes: "",
    hub_name: "",
    base_fee: "350",
    surge_multiplier: "1.0",
    active_couriers: "10",
  });

  const loadZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getZones();
      setZonesList(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load delivery zones from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createZone({
        name: newZone.name,
        code: newZone.code,
        postcodes: newZone.postcodes,
        hub_name: newZone.hub_name,
        base_fee: parseFloat(newZone.base_fee) || 350,
        currency: "Rs.",
        avg_delivery_time_mins: 30,
        active_couriers: parseInt(newZone.active_couriers, 10) || 0,
        status: "active",
        surge_multiplier: parseFloat(newZone.surge_multiplier) || 1.0,
        is_active: true,
      });
      setShowModal(false);
      setNewZone({
        name: "",
        code: "",
        postcodes: "",
        hub_name: "",
        base_fee: "350",
        surge_multiplier: "1.0",
        active_couriers: "10",
      });
      await loadZones();
    } catch (err) {
      alert((err as Error).message || "Failed to create zone");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (z: DeliveryZoneDTO) => {
    try {
      await adminApi.updateZone(z.id, {
        is_active: !z.is_active,
        status: !z.is_active ? "active" : "inactive",
      });
      await loadZones();
    } catch (err) {
      alert((err as Error).message || "Failed to update zone");
    }
  };

  const activeZones = zonesList.filter((z) => z.is_active);
  const uniqueHubs = new Set(zonesList.map((z) => z.hub_name).filter(Boolean));
  const avgSla =
    zonesList.length > 0
      ? (
        zonesList.reduce((acc, z) => acc + (z.avg_delivery_time_mins || 30), 0) /
        zonesList.length
      ).toFixed(1)
      : "0";
  const surgeZones = zonesList.filter((z) => (z.surge_multiplier || 1.0) > 1.0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Delivery Zone Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Configure geographic coverage perimeters, dispatch hubs, base delivery SLAs, and regional surge rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadZones} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
          >
            <Plus className="w-4 h-4" /> Create New Zone
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
          <p className="text-xs text-[#5b7266] font-medium">Covered Zones</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading ? "..." : `${activeZones.length} Active`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">{zonesList.length} total in DB</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Operating Hubs</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading ? "..." : `${uniqueHubs.size} Centers`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Assigned dispatch hubs</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Avg Delivery SLA</p>
          <p className="text-2xl font-bold text-[#16a34a] mt-1">
            {loading ? "..." : `${avgSla} mins`}
          </p>
          <p className="text-xs text-[#16a34a] mt-1">Across configured zones</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Dynamic Surge</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1">
            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            {loading ? "..." : `${surgeZones} Surge`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Zones above 1.0x</p>
        </div>
      </div>

      {/* Create Zone Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0f2a1d]">Create Delivery Zone</h2>
              <button onClick={() => setShowModal(false)} className="text-[#5b7266] hover:text-[#0f2a1d]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateZone} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Zone Name</label>
                <input
                  required
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  placeholder="e.g. Zone F - Galle Center"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Zone Code</label>
                <input
                  required
                  value={newZone.code}
                  onChange={(e) => setNewZone({ ...newZone, code: e.target.value })}
                  placeholder="e.g. LK-GAL-F"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Postcodes / Areas</label>
                <input
                  value={newZone.postcodes}
                  onChange={(e) => setNewZone({ ...newZone, postcodes: e.target.value })}
                  placeholder="e.g. Galle Fort, Unawatuna"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Hub Name</label>
                <input
                  value={newZone.hub_name}
                  onChange={(e) => setNewZone({ ...newZone, hub_name: e.target.value })}
                  placeholder="e.g. Southern Hub"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Base Fee (Rs.)</label>
                  <input
                    type="number"
                    value={newZone.base_fee}
                    onChange={(e) => setNewZone({ ...newZone, base_fee: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Surge (x)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newZone.surge_multiplier}
                    onChange={(e) => setNewZone({ ...newZone, surge_multiplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">Couriers</label>
                  <input
                    type="number"
                    value={newZone.active_couriers}
                    onChange={(e) => setNewZone({ ...newZone, active_couriers: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={creating} className="bg-[#0b3d2a]">
                  {creating ? "Creating..." : "Create Zone"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zone Cards Grid */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading delivery zones...
        </div>
      ) : zonesList.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#5b7266] bg-white rounded-2xl border border-[#e5eee8]">
          No delivery zones found in the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zonesList.map((z) => (
            <div
              key={z.id}
              className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm hover:border-[#16a34a]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#16a34a] bg-[#e8f5ec] px-2 py-0.5 rounded">
                      {z.code}
                    </span>
                    <h3 className="text-base font-bold text-[#0f2a1d] mt-1.5">{z.name}</h3>
                  </div>
                  <Badge variant={z.is_active ? "success" : "secondary"}>
                    {z.status || (z.is_active ? "Active" : "Inactive")}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2 text-xs text-[#5b7266]">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                    <span>
                      Coverage: <strong className="text-[#0f2a1d]">{z.postcodes || "N/A"}</strong>
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#5b7266] shrink-0" />
                    <span>
                      Assigned Hub: <strong className="text-[#0f2a1d]">{z.hub_name || "Unassigned"}</strong>
                    </span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e5eee8] grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#f9fbf9] p-2 rounded-lg">
                    <p className="text-[10px] text-[#5b7266] uppercase">Base Fee</p>
                    <p className="text-sm font-bold text-[#0f2a1d]">
                      {z.currency || "Rs."} {z.base_fee ?? 0}
                    </p>
                  </div>
                  <div className="bg-[#f9fbf9] p-2 rounded-lg">
                    <p className="text-[10px] text-[#5b7266] uppercase">Avg Delivery</p>
                    <p className="text-sm font-bold text-[#0f2a1d]">
                      {z.avg_delivery_time_mins ?? 30} mins
                    </p>
                  </div>
                  <div className="bg-[#f9fbf9] p-2 rounded-lg">
                    <p className="text-[10px] text-[#5b7266] uppercase">Couriers</p>
                    <p className="text-sm font-bold text-[#16a34a]">
                      {z.active_couriers ?? 0} online
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#e5eee8]">
                <div className="flex items-center gap-1 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[#5b7266]">Surge: </span>
                  <span className="font-semibold text-[#0f2a1d]">
                    {(z.surge_multiplier ?? 1.0).toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(z)}
                    className="text-xs py-1 px-3"
                  >
                    {z.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
