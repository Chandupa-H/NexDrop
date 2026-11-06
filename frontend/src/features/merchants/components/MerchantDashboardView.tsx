"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MerchantOrder } from "../types";
import {
  INITIAL_ORDERS,
  MOCK_API_CREDENTIALS,
  MOCK_WEBHOOK_CONFIG,
  MOCK_WEBHOOK_LOGS,
  calculateMerchantKpis,
} from "../data/mock-merchant-data";
import { OverviewTab } from "./tabs/OverviewTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { CreateOrderTab } from "./tabs/CreateOrderTab";
import { ApiTab } from "./tabs/ApiTab";
import { WebhooksTab } from "./tabs/WebhooksTab";
import { ParcelDetailModal } from "./ParcelDetailModal";

type ActiveTab = "overview" | "orders" | "create" | "api" | "webhooks";

export function MerchantDashboardView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial tab from search param
  const initialTabParam = searchParams.get("tab") as ActiveTab | null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialTabParam && ["overview", "orders", "create", "api", "webhooks"].includes(initialTabParam)
      ? initialTabParam
      : "overview"
  );

  // Sync state if query changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ActiveTab | null;
    if (tabParam && ["overview", "orders", "create", "api", "webhooks"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.replace(`/merchant/dashboard?tab=${tab}`, { scroll: false });
  };

  // State: Orders & Selected Order for Modal
  const [orders, setOrders] = useState<MerchantOrder[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const kpis = useMemo(() => calculateMerchantKpis(orders), [orders]);

  const handleOrderCreated = (newOrder: MerchantOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setSuccessBanner(`Shipment ${newOrder.trackingNumber} successfully created and registered!`);
    handleTabChange("orders");
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Dashboard Navigation Tabs */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-1.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleTabChange("overview")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "overview"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            📊 Overview
          </button>

          <button
            onClick={() => handleTabChange("orders")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            📦 All Shipments
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "orders"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("create")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "create"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            ➕ New Shipment
          </button>

          <button
            onClick={() => handleTabChange("api")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "api"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            🔑 API Keys & Docs
          </button>

          <button
            onClick={() => handleTabChange("webhooks")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "webhooks"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            ⚡ Webhooks
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-3">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="text-[11px] font-medium text-[#064E3B]">
            Fleet System Online
          </span>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === "overview" && (
        <OverviewTab
          orders={orders}
          kpis={kpis}
          onSelectOrder={(ord) => setSelectedOrder(ord)}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === "orders" && (
        <OrdersTab
          orders={orders}
          onSelectOrder={(ord) => setSelectedOrder(ord)}
          onNavigateCreate={() => handleTabChange("create")}
        />
      )}

      {activeTab === "create" && (
        <CreateOrderTab
          onOrderCreated={handleOrderCreated}
          onCancel={() => handleTabChange("orders")}
        />
      )}

      {activeTab === "api" && (
        <ApiTab credentials={MOCK_API_CREDENTIALS} />
      )}

      {activeTab === "webhooks" && (
        <WebhooksTab
          initialConfig={MOCK_WEBHOOK_CONFIG}
          initialLogs={MOCK_WEBHOOK_LOGS}
        />
      )}

      {/* Parcel Detail / Tracking Journey Modal */}
      <ParcelDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

