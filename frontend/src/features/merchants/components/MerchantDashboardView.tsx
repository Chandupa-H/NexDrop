"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, LayoutDashboard, Package, PlusCircle, Key, Webhook, X } from "lucide-react";
import type { MerchantOrder, ApiCredentials, WebhookConfig, WebhookDeliveryLog } from "../types";
import {
  INITIAL_ORDERS,
  MOCK_API_CREDENTIALS,
  MOCK_WEBHOOK_CONFIG,
  MOCK_WEBHOOK_LOGS,
  calculateMerchantKpis,
} from "../data/mock-merchant-data";
import apiClient from "@/lib/api-client";
import { OverviewTab } from "./tabs/OverviewTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { CreateOrderTab } from "./tabs/CreateOrderTab";
import { ApiTab } from "./tabs/ApiTab";
import { WebhooksTab } from "./tabs/WebhooksTab";
import { ParcelDetailModal } from "./ParcelDetailModal";
import { MerchantProfileView } from "./MerchantProfileView";

type ActiveTab = "overview" | "orders" | "create" | "api" | "webhooks" | "profile";

export function MerchantDashboardView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial tab from search param
  const initialTabParam = searchParams.get("tab") as ActiveTab | null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialTabParam && ["overview", "orders", "create", "api", "webhooks", "profile"].includes(initialTabParam)
      ? initialTabParam
      : "overview"
  );

  // Sync state if query changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ActiveTab | null;
    if (tabParam && ["overview", "orders", "create", "api", "webhooks", "profile"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.replace(`/merchant/dashboard?tab=${tab}`, { scroll: false });
  };

  // State: Orders, Credentials, Webhooks, Selected Order for Modal
  const [orders, setOrders] = useState<MerchantOrder[]>(INITIAL_ORDERS);
  const [credentials, setCredentials] = useState<ApiCredentials>(MOCK_API_CREDENTIALS);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(MOCK_WEBHOOK_CONFIG);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>(MOCK_WEBHOOK_LOGS);
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Dynamic Merchant details resolution (from login/registration or API)
  const [merchantProfile, setMerchantProfile] = useState<{
    businessName: string;
    businessAddress: string;
  }>({
    businessName: "Merchant Portal",
    businessAddress: "Colombo, Sri Lanka",
  });

  useEffect(() => {
    let merchantIdToFetch = "me";
    try {
      const stored = localStorage.getItem("nexdrop_merchant_application");
      if (!stored) {
        // Not registered -> redirect to registration form
        router.replace("/merchant/register");
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.approval_status !== "approved") {
        // Registered but not approved yet -> redirect to status page
        router.replace(
          parsed.merchant_id
            ? `/merchant/application-status?id=${parsed.merchant_id}`
            : "/merchant/application-status"
        );
        return;
      }
      if (parsed.business_name) {
        setMerchantProfile({
          businessName: parsed.business_name,
          businessAddress: parsed.business_address || "Colombo, Sri Lanka",
        });
      }
      if (parsed.merchant_id) {
        merchantIdToFetch = String(parsed.merchant_id);
      }
    } catch {
      // Ignore localStorage parse errors
    }

    let isMounted = true;

    async function loadLiveData() {
      try {
        const [liveOrders, liveCreds, liveWh, liveLogs] = await Promise.allSettled([
          apiClient.getMerchantOrders(merchantIdToFetch),
          apiClient.getMerchantCredentials(merchantIdToFetch),
          apiClient.getMerchantWebhooks(merchantIdToFetch),
          apiClient.getMerchantWebhookLogs(merchantIdToFetch),
        ]);

        if (!isMounted) return;

        if (liveOrders.status === "fulfilled" && Array.isArray(liveOrders.value)) {
          setOrders(liveOrders.value);
        }
        if (liveCreds.status === "fulfilled" && liveCreds.value?.liveKey) {
          setCredentials(liveCreds.value);
          if (liveCreds.value.businessName) {
            setMerchantProfile((prev) => ({
              ...prev,
              businessName: liveCreds.value.businessName,
            }));
          }
        }
        if (liveWh.status === "fulfilled" && liveWh.value?.targetUrl) {
          setWebhookConfig(liveWh.value);
        }
        if (liveLogs.status === "fulfilled" && Array.isArray(liveLogs.value)) {
          setWebhookLogs(liveLogs.value);
        }
      } catch {
        // Retain initial seed data if backend is unreachable
      }
    }

    loadLiveData();

    return () => {
      isMounted = false;
    };
  }, []);

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
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab !== "profile" && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-1.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleTabChange("overview")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => handleTabChange("orders")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>All Shipments</span>
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "create"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Shipment</span>
          </button>

          <button
            onClick={() => handleTabChange("api")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "api"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys & Docs</span>
          </button>

          <button
            onClick={() => handleTabChange("webhooks")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "webhooks"
                ? "bg-[#064E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-[#F8FAF8]"
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks</span>
          </button>

        </div>

        <div className="hidden sm:flex items-center gap-2 pr-3">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="text-[11px] font-medium text-[#064E3B]">
            Fleet System Online
          </span>
        </div>
      </div>
      )}

      {/* Active Tab View */}
      {activeTab === "overview" && (
        <OverviewTab
          orders={orders}
          kpis={kpis}
          credentials={credentials}
          webhookConfig={webhookConfig}
          onSelectOrder={(ord) => setSelectedOrder(ord)}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === "orders" && (
        <OrdersTab
          orders={orders}
          kpis={kpis}
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
        <ApiTab
          credentials={credentials}
          onKeyRegenerated={(newCreds) => setCredentials(newCreds)}
        />
      )}

      {activeTab === "webhooks" && (
        <WebhooksTab
          initialConfig={webhookConfig}
          initialLogs={webhookLogs}
        />
      )}

      {activeTab === "profile" && <MerchantProfileView />}

      {/* Parcel Detail / Tracking Journey Modal */}
      <ParcelDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        merchantName={merchantProfile.businessName}
        merchantAddress={merchantProfile.businessAddress}
      />
    </div>
  );
}
