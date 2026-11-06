"use client";

import { useState, useMemo } from "react";
import type { MerchantOrder, OrderStatus } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrdersTabProps {
  orders: MerchantOrder[];
  onSelectOrder: (order: MerchantOrder) => void;
  onNavigateCreate: () => void;
}

export function OrdersTab({
  orders,
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
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
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
            <span className="text-3xl">📭</span>
            <p className="text-sm font-semibold text-gray-700">No shipments match your criteria</p>
            <p className="text-xs text-gray-500">Try adjusting your filters or search terms.</p>
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
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => onSelectOrder(ord)}
                        className="font-mono font-bold text-[#064E3B] hover:text-[#16A34A] hover:underline"
                      >
                        {ord.trackingNumber}
                      </button>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{ord.recipientName}</div>
                      <div className="text-gray-500 text-[11px]">{ord.deliveryAddress}, {ord.deliveryCity}</div>
                      <div className="text-gray-400 text-[10px]">{ord.recipientPhone}</div>
                    </td>

                    <td className="px-5 py-3.5 text-gray-700">
                      <div>{ord.weightKg} kg</div>
                      <div className="text-[10px] text-gray-400">{ord.dimensions || "Medium Box"}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      {ord.codAmount > 0 ? (
                        <span className="font-semibold text-[#064E3B]">
                          COD LKR {ord.codAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500">Prepaid</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-gray-700">
                      <div>{ord.estimatedDelivery}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={ord.status} className="capitalize">
                        {ord.status.replace(/_/g, " ")}
                      </Badge>
                      {ord.status === "failed" && (
                        <span
                          className="block text-[10px] text-red-600 truncate max-w-[150px] mt-0.5 cursor-pointer"
                          title={ord.failureReason}
                        >
                          {ord.failureReason}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectOrder(ord)}
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

