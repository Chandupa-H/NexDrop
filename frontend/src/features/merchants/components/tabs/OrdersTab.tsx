"use client";

import { useState, useMemo } from "react";
import type { MerchantOrder, OrderStatus, MerchantKpis } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Package,
  PackageX,
  Truck,
  Navigation,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from "lucide-react";

interface OrdersTabProps {
  orders: MerchantOrder[];
  kpis?: MerchantKpis;
  onSelectOrder: (order: MerchantOrder) => void;
  onNavigateCreate: () => void;
}

export function OrdersTab({
  orders,
  kpis,
  onSelectOrder,
  onNavigateCreate,
}: OrdersTabProps) {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (filter !== "all" && o.status !== filter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTrack = o.trackingNumber.toLowerCase().includes(q);
        const matchesName = o.recipientName.toLowerCase().includes(q);
        const matchesCity = o.deliveryCity.toLowerCase().includes(q);
        const matchesPhone = o.recipientPhone.toLowerCase().includes(q);
        return matchesTrack || matchesName || matchesCity || matchesPhone;
      }
      return true;
    });
  }, [orders, filter, search]);

  const countByStatus = (st: "all" | OrderStatus) => {
    if (st === "all") return orders.length;
    return orders.filter((o) => o.status === st).length;
  };

  return (
    <div className="space-y-4">
      {/* Optional Top KPI Summary Strip */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Total</span>
              <Package className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="text-xl font-bold text-[#064E3B] mt-1">{kpis.totalOrders}</div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">In Transit</span>
              <Truck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-600 mt-1">{kpis.inTransit}</div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Out for Delivery</span>
              <Navigation className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 mt-1">{kpis.outForDelivery}</div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Delivered</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            </div>
            <div className="text-xl font-bold text-[#16A34A] mt-1">{kpis.delivered}</div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Issues</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600 mt-1">{kpis.failed}</div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Pending COD</span>
              <CreditCard className="w-3.5 h-3.5 text-[#064E3B]" />
            </div>
            <div className="text-base font-bold text-[#064E3B] mt-1 truncate">
              LKR {kpis.pendingCod.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Top Filter and Actions Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "created", label: "Created" },
              { key: "in_transit", label: "In Transit" },
              { key: "out_for_delivery", label: "Out for Delivery" },
              { key: "delivered", label: "Delivered" },
              { key: "failed", label: "Failed" },
            ] as const
          ).map((item) => {
            const count = countByStatus(item.key);
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#064E3B] text-white shadow-sm"
                    : "bg-[#F8FAF8] text-gray-700 hover:bg-gray-100 border border-[#E5E7EB]"
                }`}
              >
                {item.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & New Order Action */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ID, name, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-[#E5E7EB] rounded-lg bg-[#F8FAF8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064E3B] w-56 sm:w-64"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateCreate}
            className="whitespace-nowrap font-bold"
          >
            + New Shipment
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <PackageX className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">
              {orders.length === 0
                ? "No shipments registered yet"
                : "No shipments match your criteria"}
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {orders.length === 0
                ? "You haven't created any delivery shipments yet. Click below to dispatch your first parcel."
                : "Try adjusting your status filter or search keywords."}
            </p>
            {orders.length === 0 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onNavigateCreate}
                className="font-semibold shadow-sm"
              >
                + Create First Shipment
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF8] text-gray-600 font-semibold border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-3">Tracking ID</th>
                  <th className="px-5 py-3">Recipient & Address</th>
                  <th className="px-5 py-3">Weight</th>
                  <th className="px-5 py-3">Payment / COD</th>
                  <th className="px-5 py-3">Estimated Delivery</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F9FAF9] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#064E3B]">
                      {ord.trackingNumber}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{ord.recipientName}</div>
                      <div className="text-gray-500 text-[11px] truncate max-w-[200px]">
                        {ord.deliveryAddress}, {ord.deliveryCity}
                      </div>
                      <div className="text-gray-400 text-[10px]">{ord.recipientPhone}</div>
                    </td>

                    <td className="px-5 py-3.5 text-gray-700">
                      <div>{ord.weightKg} kg</div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {ord.dimensions || "Standard"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {ord.codAmount > 0 ? (
                        <div>
                          <span className="font-semibold text-[#064E3B]">
                            LKR {ord.codAmount.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-amber-700 font-medium">
                            COD to Collect
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Prepaid
                        </Badge>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-gray-600">
                      <div>{ord.estimatedDelivery}</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={ord.status} className="capitalize text-[11px]">
                        {ord.status.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectOrder(ord)}
                        className="text-xs"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
