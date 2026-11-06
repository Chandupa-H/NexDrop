"use client";

import type { MerchantOrder, MerchantKpis } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OverviewTabProps {
  orders: MerchantOrder[];
  kpis: MerchantKpis;
  onSelectOrder: (order: MerchantOrder) => void;
  onNavigateTab: (tab: "overview" | "orders" | "create" | "api" | "webhooks") => void;
}

export function OverviewTab({
  orders,
  kpis,
  onSelectOrder,
  onNavigateTab,
}: OverviewTabProps) {
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#064E3B] to-[#043327] rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#A3E635]">
            NexDrop Merchant Portal
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
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            🔑 API Keys & Docs
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
            <span className="text-base">📦</span>
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
            <span className="text-base">🚚</span>
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
            <span className="text-base">🛵</span>
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
            <span className="text-base">✅</span>
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
              Failed
            </span>
            <span className="text-base">⚠️</span>
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
            <span className="text-base">💰</span>
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
              <span className="h-7 w-7 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center text-sm font-bold">
                🔑
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#064E3B]">Secured Merchant API</h3>
                <p className="text-xs text-gray-500">Bearer token & OAuth 2.0 automated creation</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              Live & Active
            </span>
          </div>

          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-lg p-2.5 flex items-center justify-between">
            <code className="text-xs font-mono text-gray-700">
              nd_live_9b4e7a2c...a892b
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
              <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                ⚡
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#064E3B]">Real-time Webhook Receiver</h3>
                <p className="text-xs text-gray-500">Asynchronous status change notifications</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
              6 Events Hooked
            </span>
          </div>

          <div className="bg-[#F8FAF8] border border-[#E5E7EB] rounded-lg p-2.5 flex items-center justify-between">
            <code className="text-xs font-mono text-gray-700 truncate max-w-[280px]">
              https://ceyloncrafts.lk/api/webhooks/nexdrop
            </code>
            <button
              onClick={() => onNavigateTab("webhooks")}
              className="text-xs font-semibold text-[#16A34A] hover:text-[#064E3B] hover:underline"
            >
              Test Ping →
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
              {recentOrders.map((ord) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

