"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { adminApi, type AdminCourierDTO } from "@/features/admin/api/admin.api";
import {
  Bike,
  Car,
  Download,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Star,
  Truck,
} from "lucide-react";

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<AdminCourierDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCouriers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getCouriers();
      setCouriers(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load couriers from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  const filteredCouriers = couriers.filter((c) => {
    const matchesVehicle =
      vehicleFilter === "All" ||
      c.vehicle_type.toLowerCase().includes(vehicleFilter.toLowerCase());
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.display_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.license_plate || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVehicle && matchesSearch;
  });

  const activeCount = couriers.filter((c) => c.is_available).length;
  const deliveringCount = couriers.filter((c) => !c.is_available).length;
  const avgRating =
    couriers.length > 0
      ? (couriers.reduce((acc, c) => acc + c.rating, 0) / couriers.length).toFixed(2)
      : "0.00";

  const exportRoster = () => {
    const headers = ["ID", "Name", "Email", "Vehicle", "License Plate", "Zone", "Status"];
    const rows = filteredCouriers.map((c) => [
      c.display_id,
      `"${c.name}"`,
      c.email,
      c.vehicle_type,
      c.license_plate || "",
      `"${c.zone}"`,
      c.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexdrop-couriers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Courier Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Monitor, inspect, and manage delivery fleet driver accounts from database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCouriers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportRoster} className="gap-1.5">
            <Download className="w-4 h-4" /> Export Roster
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Total Fleet Drivers</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">{loading ? "..." : couriers.length}</p>
          <p className="text-xs text-[#5b7266] mt-1">Registered couriers</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Available for Dispatch</p>
          <p className="text-2xl font-bold text-[#16a34a] mt-1">{loading ? "..." : activeCount}</p>
          <p className="text-xs text-[#16a34a] mt-1">
            {couriers.length > 0 ? `${Math.round((activeCount / couriers.length) * 100)}% fleet ready` : "0%"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Currently On Delivery</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">{loading ? "..." : deliveringCount}</p>
          <p className="text-xs text-[#5b7266] mt-1">Active routes</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Average Fleet Rating</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1">
            {loading ? "..." : avgRating} <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Live fleet score</p>
        </div>
      </div>

      {/* Main Roster Card */}
      <SectionCard title="Courier Fleet Roster" subtitle="Live fleet drivers joined with user profiles">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
              <input
                type="text"
                placeholder="Search driver name, license, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a] text-[#0f2a1d]"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["All", "Motorcycle", "Van", "Bicycle", "Truck"].map((veh) => (
                <button
                  key={veh}
                  onClick={() => setVehicleFilter(veh)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${vehicleFilter === veh
                      ? "bg-[#0b3d2a] text-white"
                      : "bg-[#e8f5ec] text-[#0b3d2a] hover:bg-[#d5ecd9]"
                    }`}
                >
                  {veh}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                <tr>
                  <th className="py-3 px-4">Driver Profile</th>
                  <th className="py-3 px-4">Vehicle & License</th>
                  <th className="py-3 px-4">Operating Hub</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Trips & Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eee8]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#5b7266] text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading couriers...
                      </span>
                    </td>
                  </tr>
                ) : filteredCouriers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#5b7266] text-sm">
                      No couriers match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCouriers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#f9fbf9] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0b3d2a] text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0f2a1d]">{c.name}</p>
                            <p className="text-xs text-[#5b7266]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {c.vehicle_type.toLowerCase().includes("motor") && (
                            <Bike className="w-4 h-4 text-[#16a34a]" />
                          )}
                          {c.vehicle_type.toLowerCase().includes("van") && (
                            <Car className="w-4 h-4 text-[#16a34a]" />
                          )}
                          {c.vehicle_type.toLowerCase().includes("truck") && (
                            <Truck className="w-4 h-4 text-[#16a34a]" />
                          )}
                          {c.vehicle_type.toLowerCase().includes("bike") ||
                            c.vehicle_type.toLowerCase().includes("bicycle") ? (
                            <Bike className="w-4 h-4 text-[#16a34a]" />
                          ) : null}
                          <div>
                            <p className="text-xs font-semibold text-[#0f2a1d]">{c.vehicle_type}</p>
                            <p className="text-xs text-[#5b7266] font-mono">
                              {c.license_plate || "Unassigned"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#0f2a1d]">
                        <span className="flex items-center gap-1 text-[#5b7266]">
                          <MapPin className="w-3.5 h-3.5 text-[#16a34a]" /> {c.zone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.is_available
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                        >
                          {c.status}
                          {c.active_order && <span className="font-mono text-[10px]">({c.active_order})</span>}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-semibold text-[#0f2a1d]">{c.completed_trips} trips</p>
                        <p className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {c.rating}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
