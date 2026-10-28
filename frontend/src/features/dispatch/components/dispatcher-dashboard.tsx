"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiClient, { DispatcherDashboardStats } from "@/lib/api-client";

export function DispatcherDashboard() {
  const [stats, setStats] = useState<DispatcherDashboardStats>({
    total_parcels: 0,
    unassigned_parcels: 0,
    active_deliveries: 0,
    completed_deliveries: 0,
    failed_deliveries: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDispatcherStats();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Failed to fetch live dispatcher metrics, using current state", err);
      setError("Unable to sync live metrics from backend. Showing cached state.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh metrics every 30 seconds (strictly read-only query)
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const cards = [
    {
      title: "Total Parcels",
      value: stats.total_parcels,
      description: "Total packages registered across platform",
      icon: Package,
      color: "text-[#064E3B]",
      bgColor: "bg-[#064E3B]/10",
      borderColor: "border-[#064E3B]/20",
      badge: "Platform Volume",
      badgeVariant: "default" as const,
    },
    {
      title: "Unassigned Parcels",
      value: stats.unassigned_parcels,
      description: "Pending assignment to a courier",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      badge: stats.unassigned_parcels > 0 ? "Action Required" : "Queue Clear",
      badgeVariant: "outline" as const,
    },
    {
      title: "Active Deliveries",
      value: stats.active_deliveries,
      description: "In transit or out for delivery",
      icon: Truck,
      color: "text-[#16A34A]",
      bgColor: "bg-[#16A34A]/10",
      borderColor: "border-[#16A34A]/20",
      badge: "On the Road",
      badgeVariant: "lime" as const,
    },
    {
      title: "Completed Deliveries",
      value: stats.completed_deliveries,
      description: "Successfully delivered to recipients",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      badge: "Fulfilled",
      badgeVariant: "default" as const,
    },
    {
      title: "Failed Deliveries",
      value: stats.failed_deliveries,
      description: "Cancelled or rejected delivery orders",
      icon: XCircle,
      color: "text-rose-600",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      badge: stats.failed_deliveries > 0 ? "Needs Review" : "Zero Incidents",
      badgeVariant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="lime" className="text-xs uppercase tracking-wider font-semibold">
              Squad 4 • Dispatch Operations
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#064E3B]">
            Dispatcher Dashboard
          </h1>
          <p className="text-sm text-[#1F2937]/70 mt-1">
            Real-time fleet operations, parcel allocation queues, and live delivery telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[#64748B] hidden sm:inline">
              Synced: <span className="font-mono font-medium">{lastUpdated}</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-[#16A34A]" : ""}`} />
            <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.title}
              className={`border transition-all hover:shadow-md bg-white ${c.borderColor}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  {c.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${c.bgColor}`}>
                  <Icon className={`h-5 w-5 ${c.color}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-extrabold text-[#1F2937] tracking-tight">
                  {isLoading ? (
                    <span className="inline-block h-8 w-12 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    c.value.toLocaleString()
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <Badge variant={c.badgeVariant} className="text-[10px] px-2 py-0.5">
                    {c.badge}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#64748B] leading-tight pt-1">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delivery Pipeline Distribution */}
      <Card className="w-full border border-[#E5E7EB] bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-[#064E3B]">Pipeline Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Distribution of packages currently tracked in the database
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Live Status
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Progress Bar Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-[#1F2937]">
              <span>Pipeline Stage Coverage</span>
              <span>
                {stats.total_parcels > 0
                  ? `${Math.round(((stats.completed_deliveries + stats.active_deliveries) / stats.total_parcels) * 100)}% active or fulfilled`
                  : "No parcels recorded"}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${stats.total_parcels > 0 ? (stats.completed_deliveries / stats.total_parcels) * 100 : 0}%`,
                }}
                className="bg-emerald-500 transition-all duration-500"
                title="Completed"
              />
              <div
                style={{
                  width: `${stats.total_parcels > 0 ? (stats.active_deliveries / stats.total_parcels) * 100 : 0}%`,
                }}
                className="bg-[#16A34A] transition-all duration-500"
                title="Active"
              />
              <div
                style={{
                  width: `${stats.total_parcels > 0 ? (stats.unassigned_parcels / stats.total_parcels) * 100 : 0}%`,
                }}
                className="bg-amber-400 transition-all duration-500"
                title="Unassigned"
              />
              <div
                style={{
                  width: `${stats.total_parcels > 0 ? (stats.failed_deliveries / stats.total_parcels) * 100 : 0}%`,
                }}
                className="bg-rose-500 transition-all duration-500"
                title="Failed"
              />
            </div>
          </div>

          {/* Stage legend items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-slate-100 bg-[#F1F5F1]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-[#1F2937]">Unassigned</span>
              </div>
              <div className="text-lg font-bold text-[#1F2937]">{stats.unassigned_parcels}</div>
              <span className="text-[10px] text-[#64748B]">Awaiting courier</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-[#F1F5F1]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                <span className="text-xs font-semibold text-[#1F2937]">In Progress</span>
              </div>
              <div className="text-lg font-bold text-[#1F2937]">{stats.active_deliveries}</div>
              <span className="text-[10px] text-[#64748B]">En route to destination</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-[#F1F5F1]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-[#1F2937]">Delivered</span>
              </div>
              <div className="text-lg font-bold text-[#1F2937]">{stats.completed_deliveries}</div>
              <span className="text-[10px] text-[#64748B]">Confirmed received</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-[#F1F5F1]/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-[#1F2937]">Cancelled</span>
              </div>
              <div className="text-lg font-bold text-[#1F2937]">{stats.failed_deliveries}</div>
              <span className="text-[10px] text-[#64748B]">Failed / Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
