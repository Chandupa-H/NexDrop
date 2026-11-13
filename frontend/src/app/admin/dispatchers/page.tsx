"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { adminApi, type AdminDispatcherDTO } from "@/features/admin/api/admin.api";
import {
  Clock,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
  Search,
} from "lucide-react";

export default function AdminDispatchersPage() {
  const [dispatchers, setDispatchers] = useState<AdminDispatcherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadDispatchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDispatchers();
      setDispatchers(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load dispatchers from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDispatchers();
  }, []);

  const filtered = dispatchers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hub.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.display_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onDutyCount = dispatchers.filter((d) => d.status === "On Duty").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Dispatcher Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Assign hub territories, monitor operational dispatchers, and oversee shift schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDispatchers} disabled={loading} className="gap-1.5">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Active Dispatchers Now</p>
          <p className="text-2xl font-bold text-[#16a34a] mt-1">
            {loading ? "..." : `${onDutyCount} On Duty`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Covering active delivery hubs</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Total Dispatch Personnel</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading ? "..." : `${dispatchers.length} Accounts`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Database-verified accounts</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Supervised Couriers</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">
            {loading
              ? "..."
              : dispatchers.reduce((acc, d) => acc + d.assigned_couriers, 0)}
          </p>
          <p className="text-xs text-[#16a34a] mt-1">Across regional hubs</p>
        </div>
      </div>

      {/* Directory Section */}
      <SectionCard
        title="Operational Dispatch Officers"
        subtitle="Dispatcher and admin supervisors fetched from PostgreSQL"
      >
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
            <input
              type="text"
              placeholder="Search dispatcher or hub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a] text-[#0f2a1d]"
            />
          </div>

          <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                <tr>
                  <th className="py-3 px-4">Dispatcher Profile</th>
                  <th className="py-3 px-4">Assigned Delivery Hub</th>
                  <th className="py-3 px-4">Supervised Couriers</th>
                  <th className="py-3 px-4">Current Shift</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eee8]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#5b7266] text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading dispatchers...
                      </span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#5b7266] text-sm">
                      No dispatcher accounts found in the database.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-[#f9fbf9] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#16a34a]/10 text-[#16a34a] font-bold text-xs flex items-center justify-center shrink-0">
                            <Radio className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#0f2a1d]">{d.name}</p>
                            <p className="text-xs text-[#5b7266]">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 text-xs text-[#0f2a1d] font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#16a34a]" /> {d.hub}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-[#0f2a1d]">
                        {d.assigned_couriers} Couriers
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5b7266]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {d.shift}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={d.status === "On Duty" ? "success" : "secondary"}>
                          {d.status}
                        </Badge>
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
