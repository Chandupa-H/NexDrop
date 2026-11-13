"use client";

import type { MerchantOrder, MerchantKpis, ApiCredentials, WebhookConfig } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Truck,
  Navigation,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Key,
  Webhook,
} from "lucide-react";

interface OverviewTabProps {
  orders: MerchantOrder[];
  kpis: MerchantKpis;
  credentials?: ApiCredentials;
  webhookConfig?: WebhookConfig;
  onSelectOrder: (order: MerchantOrder) => void;
  onNavigateTab: (tab: "orders" | "create" | "api" | "webhooks") => void;
}

export function OverviewTab({
  orders,
  kpis,
  credentials,
  webhookConfig,
  onSelectOrder,
  onNavigateTab,
}: OverviewTabProps) {
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome / Operations Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#043327] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md border border-emerald-900/40">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800/60 text-emerald-200 border border-emerald-700/50 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#A3E635] animate-ping" />
            Live Merchant Operations
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">
            Fleet & Dispatch Overview
          </h2>
          <p className="text-xs text-emerald-200 mt-1 max-w-xl">
            Real-time island-wide courier fulfillment, automated webhook triggers, and secure API tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => onNavigateTab("api")}
            className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white flex items-center gap-2"
          >
            <Key className="w-4 h-4 text-[#A3E635]" />
            <span>API Keys & Docs</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigateTab("create")}
            className="bg-[#A3E635] text-[#064E3B] hover:bg-[#84CC16] font-bold shadow-md"
          >
            + New Shipment
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Shipments */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Parcels
            </span>
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#064E3B] mt-2">
            {kpis.totalOrders}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">All time</p>
        </div>

        {/* In Transit */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              In Transit
            </span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 mt-2">
            {kpis.inTransit}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Sorting hubs</p>
        </div>

        {/* Out for Delivery */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Out for Delivery
            </span>
            <Navigation className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">
            {kpis.outForDelivery}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">With couriers</p>
        </div>

        {/* Delivered */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Delivered
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-extrabold text-[#16A34A] mt-2">
            {kpis.delivered}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {kpis.successRate}% Success rate
          </p>
        </div>

        {/* Failed */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Delivery Issues
            </span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            {kpis.failed}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Requires review</p>
        </div>

        {/* Pending COD Remittance */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending COD
            </span>
            <CreditCard className="w-4 h-4 text-[#064E3B]" />
          </div>
          <div className="text-lg font-extrabold text-[#064E3B] mt-2 truncate">
            LKR {kpis.pendingCod.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Next payout Friday</p>
        </div>
      </div>

      {/* Integration Shortcuts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Developer API Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center">
                <Key className="w-4 h-4 text-[#064E3B]" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#064E3B]">Secured Merchant API</h3>
                <p className="text-xs text-gray-500">Bearer token & OAuth 2.0 automated creation</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                credentials?.liveKey ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
              }`}
            >
              {credentials?.liveKey ? "Live & Active" : "Pending Keys"}
            </span>
          </div>

          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-lg p-2.5 flex items-center justify-between">
            <code className="text-xs font-mono text-gray-700">
              {credentials?.liveKey
                ? `${credentials.liveKey.slice(0, 10)}••••••••••••`
                : "No active production key"}
            </code>
            <button
              onClick={() => onNavigateTab("api")}
              className="text-xs font-semibold text-[#16A34A] hover:text-[#064E3B] hover:underline"
            >
              View Key & Snippets →
            </button>
          </div>
        </div>

        {/* Webhooks Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Webhook className="w-4 h-4 text-blue-700" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#064E3B]">Real-time Webhook Receiver</h3>
                <p className="text-xs text-gray-500">Asynchronous status change notifications</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                webhookConfig?.isActive && webhookConfig?.targetUrl
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {webhookConfig?.isActive && webhookConfig?.targetUrl ? "Active Events" : "Not Configured"}
            </span>
          </div>

          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-lg p-2.5 flex items-center justify-between">
            <code className="text-xs font-mono text-gray-700 truncate max-w-[280px]">
              {webhookConfig?.targetUrl ? webhookConfig.targetUrl : "No webhook URL configured"}
            </code>
            <button
              onClick={() => onNavigateTab("webhooks")}
              className="text-xs font-semibold text-[#16A34A] hover:text-[#064E3B] hover:underline"
            >
              Configure →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Shipments Preview */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAF8]">
          <div>
            <h3 className="font-bold text-sm text-[#064E3B]">Recent Shipments</h3>
            <p className="text-xs text-gray-500">Latest island-wide consignments and live delivery status</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab("orders")}
            className="text-[#064E3B] font-semibold"
          >
            View All ({orders.length}) →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 text-gray-600 font-semibold border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-3">Tracking #</th>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Destination</th>
                <th className="px-6 py-3">Weight & COD</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No shipments created yet. Click &quot;+ New Shipment&quot; above to create your first dispatch.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F9FAF9] transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-[#064E3B]">
                      {ord.trackingNumber}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-gray-900">{ord.recipientName}</div>
                      <div className="text-gray-500 text-[11px]">{ord.recipientPhone}</div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-700">{ord.deliveryCity}</td>
                    <td className="px-6 py-3.5">
                      <div>{ord.weightKg} kg</div>
                      <div className="text-[11px] font-medium text-[#064E3B]">
                        {ord.codAmount > 0 ? `COD LKR ${ord.codAmount.toLocaleString()}` : "Prepaid"}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={ord.status} className="capitalize">
                        {ord.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectOrder(ord)}
                      >
                        Track
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
