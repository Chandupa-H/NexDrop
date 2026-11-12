"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import {
  adminApi,
  type AdminAnalyticsDTO,
  type AdminMerchantDTO,
} from "@/features/admin/api/admin.api";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  TrendingUp,
  Truck,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsDTO | null>(null);
  const [merchants, setMerchants] = useState<AdminMerchantDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, merchantsRes] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getMerchants(),
      ]);
      setAnalytics(analyticsRes);
      setMerchants(merchantsRes);
    } catch (err) {
      setError((err as Error).message || "Failed to load analytics from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const total = analytics?.total_parcels ?? 0;
  const delivered = analytics?.delivered_count ?? 0;
  const inTransit = analytics?.in_transit_count ?? 0;
  const pending = analytics?.pending_count ?? 0;
  const cancelled = analytics?.cancelled_count ?? 0;

  const pct = (val: number) => (total > 0 ? ((val / total) * 100).toFixed(1) : "0.0");

  const exportReport = () => {
    if (!analytics) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Parcels", analytics.total_parcels],
      ["Delivered", analytics.delivered_count],
      ["In Transit", analytics.in_transit_count],
      ["Pending", analytics.pending_count],
      ["Cancelled", analytics.cancelled_count],
      ["Estimated Revenue (Rs.)", analytics.total_revenue],
      ["Completion Rate (%)", analytics.completion_rate],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexdrop-analytics-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Reports & Analytics</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Live delivery metrics, parcel lifecycle distribution, and regional zone telemetry from PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={exportReport}
            disabled={!analytics}
            className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Total Parcels</span>
            <Truck className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">
            {loading ? "..." : total}
          </p>
          <p className="text-xs text-[#16a34a] font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Live DB total
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Estimated GMV</span>
            <span className="text-xs font-bold text-[#16a34a]">Rs.</span>
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">
            {loading ? "..." : `Rs. ${(analytics?.total_revenue ?? 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Calculated from parcel volume</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#16a34a] mt-2">
            {loading ? "..." : `${analytics?.completion_rate ?? 0}%`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">{delivered} delivered parcels</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Avg SLA Target</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">
            {loading ? "..." : `${analytics?.avg_delivery_mins ?? 28} mins`}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Average zone delivery time</p>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Fulfillment Status & Performance */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Delivery Fulfillment Performance"
            subtitle="Live parcel status breakdown from database"
          >
            {loading ? (
              <div className="py-10 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading fulfillment metrics...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="p-3 bg-[#e8f5ec] rounded-xl text-center">
                    <p className="text-[11px] text-[#0b3d2a] font-semibold">Delivered</p>
                    <p className="text-lg font-bold text-[#16a34a] mt-0.5">{delivered}</p>
                    <p className="text-[10px] text-[#5b7266]">{pct(delivered)}%</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-center">
                    <p className="text-[11px] text-blue-900 font-semibold">In Transit</p>
                    <p className="text-lg font-bold text-blue-600 mt-0.5">{inTransit}</p>
                    <p className="text-[10px] text-blue-700">{pct(inTransit)}%</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl text-center">
                    <p className="text-[11px] text-amber-900 font-semibold">Pending</p>
                    <p className="text-lg font-bold text-amber-600 mt-0.5">{pending}</p>
                    <p className="text-[10px] text-amber-700">{pct(pending)}%</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl text-center">
                    <p className="text-[11px] text-red-900 font-semibold">Cancelled</p>
                    <p className="text-lg font-bold text-red-600 mt-0.5">{cancelled}</p>
                    <p className="text-[10px] text-red-700">{pct(cancelled)}%</p>
                  </div>
                </div>

                {/* Progress visual bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-[#5b7266]">
                    <span>Fulfillment Distribution</span>
                    <span className="font-semibold text-[#0f2a1d]">
                      {delivered} delivered / {total} total parcels
                    </span>
                  </div>
                  <div className="h-3 w-full bg-[#e5eee8] rounded-full overflow-hidden flex">
                    {total > 0 && (
                      <>
                        <div style={{ width: `${pct(delivered)}%` }} className="bg-[#16a34a] h-full" />
                        <div style={{ width: `${pct(inTransit)}%` }} className="bg-blue-500 h-full" />
                        <div style={{ width: `${pct(pending)}%` }} className="bg-amber-400 h-full" />
                        <div style={{ width: `${pct(cancelled)}%` }} className="bg-red-500 h-full" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Registered Merchants Table */}
          <SectionCard
            title="Registered Business Partners"
            subtitle="Live merchant accounts from database"
          >
            {loading ? (
              <div className="py-8 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading merchants...
              </div>
            ) : merchants.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#5b7266]">No merchants registered yet.</div>
            ) : (
              <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Merchant Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Owner</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eee8]">
                    {merchants.map((m) => (
                      <tr key={m.id} className="hover:bg-[#f9fbf9]">
                        <td className="py-3 px-3 font-semibold text-[#0f2a1d]">{m.business_name}</td>
                        <td className="py-3 px-3 text-xs text-[#5b7266]">{m.business_type || "Retail"}</td>
                        <td className="py-3 px-3 text-xs text-[#0f2a1d]">{m.owner_name}</td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              m.approval_status === "approved"
                                ? "success"
                                : m.approval_status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {m.approval_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Zone Performance */}
        <div className="space-y-6">
          <SectionCard
            title="Zone Coverage & Fleet"
            subtitle="Active couriers assigned per zone in database"
          >
            {loading ? (
              <div className="py-8 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading zones...
              </div>
            ) : (analytics?.zone_volume ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-[#5b7266]">No zones found.</div>
            ) : (
              <div className="space-y-3">
                {(analytics?.zone_volume ?? []).map((z, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#e5eee8] bg-[#fdfefe] flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#0f2a1d]">{z.name}</p>
                      <p className="text-xs text-[#5b7266] mt-0.5">
                        {z.code} • {z.activeCouriers} couriers
                      </p>
                    </div>
                    <Badge variant="success">{z.deliveries} est.</Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
