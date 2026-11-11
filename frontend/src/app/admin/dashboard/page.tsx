"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard, SectionCard } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, type AdminDashboardDTO } from "@/features/admin/api/admin.api";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
  Users,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard();
      setData(res);
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard data from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = data?.stats;
  const zoneLoads = data?.zone_loads ?? [];
  const recentActivity = data?.recent_activity ?? [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#0b3d2a] to-[#06291c] rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#b6f36b] text-[#0b3d2a]">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Live
            </span>
            <span className="text-xs text-white/70">Connected to PostgreSQL • Real-time DB Data</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Command Center</h1>
          <p className="text-sm text-white/80 mt-1">
            Real-time logistics monitoring, account administration, and platform operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link href="/admin/merchants">
            <Button variant="lime" size="sm" className="gap-1.5">
              <Store className="w-4 h-4" /> Review Registrations
            </Button>
          </Link>
          <Link href="/admin/couriers">
            <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5">
              <Plus className="w-4 h-4" /> Manage Couriers
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadDashboard}>
            Retry
          </Button>
        </div>
      )}

      {/* Primary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Deliveries"
          value={loading ? "..." : String(stats?.active_deliveries ?? 0)}
          icon="truck"
          tone="success"
          deltaLabel={`${stats?.total_deliveries ?? 0} total parcels`}
        />
        <StatCard
          label="Registered Merchants"
          value={loading ? "..." : String(stats?.registered_merchants ?? 0)}
          icon="store"
          tone="info"
          deltaLabel={`${stats?.pending_merchants ?? 0} pending review`}
        />
        <StatCard
          label="Couriers Available"
          value={loading ? "..." : `${stats?.active_couriers ?? 0} / ${stats?.total_couriers ?? 0}`}
          icon="users"
          tone="success"
          deltaLabel={
            stats && stats.total_couriers > 0
              ? `${Math.round((stats.active_couriers / stats.total_couriers) * 100)}% fleet available`
              : "No couriers yet"
          }
        />
        <StatCard
          label="Estimated GMV"
          value={loading ? "..." : `Rs. ${(stats?.gmv_revenue ?? 0).toLocaleString()}`}
          icon="dollar-sign"
          tone="success"
          deltaLabel={`${stats?.total_users ?? 0} total accounts`}
        />
      </div>

      {/* Main Grid: Zones, Alerts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Zone Fleet Activity */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Live Delivery Zone Status"
            subtitle="Active courier allocation and delivery zone configuration from database"
            action={
              <Link href="/admin/zones" className="text-xs font-semibold text-[#16a34a] hover:underline flex items-center gap-1">
                Configure Zones <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {loading ? (
              <div className="py-12 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading zones...
              </div>
            ) : zoneLoads.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#5b7266]">No delivery zones found in database.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                      <th className="py-2.5 px-3">Zone</th>
                      <th className="py-2.5 px-3">Couriers</th>
                      <th className="py-2.5 px-3">Base Fee</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eee8]">
                    {zoneLoads.map((z) => (
                      <tr key={z.id} className="hover:bg-[#f9fbf9] transition-colors">
                        <td className="py-3 px-3 font-medium text-[#0f2a1d] flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#16a34a] shrink-0" />
                          <span>{z.name}</span>
                        </td>
                        <td className="py-3 px-3 text-[#5b7266]">{z.activeCouriers} online</td>
                        <td className="py-3 px-3 text-[#0f2a1d] font-semibold">
                          {z.currency} {z.baseFee.toFixed(0)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              z.status.toLowerCase() === "active" || z.status.toLowerCase() === "optimal"
                                ? "success"
                                : z.status.toLowerCase() === "testing"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {z.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link href="/admin/zones">
                            <button className="text-xs text-[#16a34a] hover:underline font-medium">
                              Manage
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Platform Audit & Activity Log */}
          <SectionCard
            title="Real-Time System Log"
            subtitle="Live events derived from recent database records"
            action={
              <Link href="/admin/analytics" className="text-xs font-semibold text-[#16a34a] hover:underline flex items-center gap-1">
                Full Report <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {loading ? (
              <div className="py-12 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading activity...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#5b7266]">No recent activity recorded yet.</div>
            ) : (
              <div className="divide-y divide-[#e5eee8]">
                {recentActivity.map((act) => (
                  <div key={act.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#e8f5ec] text-[#16a34a] flex items-center justify-center shrink-0">
                        {act.type === "merchant" && <Store className="w-4 h-4" />}
                        {act.type === "courier" && <Truck className="w-4 h-4" />}
                        {act.type === "parcel" && <Package className="w-4 h-4" />}
                        {act.type !== "merchant" && act.type !== "courier" && act.type !== "parcel" && (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0f2a1d]">{act.action}</p>
                        <p className="text-xs text-[#5b7266]">{act.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-xs text-[#5b7266]">{act.time}</span>
                      <Badge variant={act.tone === "warning" ? "secondary" : "success"}>
                        {act.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column (1 col): Pending Actions & Quick Links */}
        <div className="space-y-6">
          <SectionCard
            title="Action Required"
            subtitle="Items awaiting administrator intervention"
          >
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-[#9a5b00]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">
                      {stats?.pending_merchants ?? 0} Pending Merchant Approvals
                    </p>
                    <p className="text-xs mt-0.5 text-amber-800">
                      New business registrations awaiting KYC review and API key issuance.
                    </p>
                    <Link href="/admin/merchants" className="inline-block mt-2 text-xs font-semibold text-amber-900 underline">
                      Review Merchants →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#16a34a]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[#0f2a1d] tracking-wide">
                      {stats?.active_couriers ?? 0} Active Fleet Couriers
                    </p>
                    <p className="text-xs mt-0.5 text-[#5b7266]">
                      Out of {stats?.total_couriers ?? 0} registered delivery personnel in the system.
                    </p>
                    <Link href="/admin/couriers" className="inline-block mt-2 text-xs font-semibold text-[#16a34a] underline">
                      Inspect Couriers →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white">
                <div className="flex items-start gap-2.5">
                  <Users className="w-5 h-5 shrink-0 mt-0.5 text-[#5b7266]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[#0f2a1d] tracking-wide">
                      {stats?.total_users ?? 0} Total Platform Accounts
                    </p>
                    <p className="text-xs mt-0.5 text-[#5b7266]">
                      View and manage user permissions and activation status.
                    </p>
                    <Link href="/admin/users" className="inline-block mt-2 text-xs font-semibold text-[#16a34a] underline">
                      View Users →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Quick Admin Navigation */}
          <SectionCard
            title="Management Shortcuts"
            subtitle="Fast navigation to primary consoles"
          >
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/users" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <Users className="w-5 h-5 text-[#16a34a]" />
                <span className="text-xs font-medium text-[#0f2a1d]">Users</span>
              </Link>
              <Link href="/admin/merchants" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <Store className="w-5 h-5 text-[#16a34a]" />
                <span className="text-xs font-medium text-[#0f2a1d]">Merchants</span>
              </Link>
              <Link href="/admin/zones" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <MapPin className="w-5 h-5 text-[#16a34a]" />
                <span className="text-xs font-medium text-[#0f2a1d]">Delivery Zones</span>
              </Link>
              <Link href="/admin/pricing" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <span className="font-bold text-[#16a34a] text-base leading-none">Rs</span>
                <span className="text-xs font-medium text-[#0f2a1d]">Pricing</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
