"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Bike, 
  Car, 
  Download, 
  MapPin, 
  MoreVertical, 
  Plus, 
  Search, 
  Star, 
  Truck, 
  UserCheck, 
  UserX 
} from "lucide-react";

const COURIER_ROSTER = [
  {
    id: "CUR-0104",
    name: "Kamal Perera",
    phone: "+94 77 441 2299",
    vehicleType: "Motorcycle",
    licensePlate: "WP BDM-8491",
    zone: "Zone A (Colombo Fort)",
    status: "In Delivery",
    rating: 4.9,
    completedTrips: 1420,
    activeOrder: "ND-99214",
  },
  {
    id: "CUR-0105",
    name: "Sunil Shantha",
    phone: "+94 71 883 1100",
    vehicleType: "Van",
    licensePlate: "WP CAR-5521",
    zone: "Zone B (Bambalapitiya)",
    status: "Available",
    rating: 4.8,
    completedTrips: 890,
    activeOrder: null,
  },
  {
    id: "CUR-0106",
    name: "Ruwan Jayatissa",
    phone: "+94 76 112 4477",
    vehicleType: "Motorcycle",
    licensePlate: "WP BDT-3312",
    zone: "Zone C (Dehiwala)",
    status: "In Delivery",
    rating: 4.95,
    completedTrips: 2100,
    activeOrder: "ND-99302",
  },
  {
    id: "CUR-0107",
    name: "Mohamed Rilwan",
    phone: "+94 70 994 3322",
    vehicleType: "Light Truck",
    licensePlate: "WP LK-1092",
    zone: "Zone D (Kaduwela / Malabe)",
    status: "Off Shift",
    rating: 4.7,
    completedTrips: 640,
    activeOrder: null,
  },
  {
    id: "CUR-0108",
    name: "Janaka Bandara",
    phone: "+94 72 667 8899",
    vehicleType: "Bicycle",
    licensePlate: "N/A (Eco-Cycle)",
    zone: "Zone A (Colombo Fort)",
    status: "Available",
    rating: 4.88,
    completedTrips: 430,
    activeOrder: null,
  },
];

export default function AdminCouriersPage() {
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCouriers = COURIER_ROSTER.filter((c) => {
    const matchesVehicle = vehicleFilter === "All" || c.vehicleType === vehicleFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVehicle && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Courier Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Create, manage, monitor, and deactivate delivery fleet driver accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-4 h-4" /> Export Roster
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]">
            <Plus className="w-4 h-4" /> Onboard Courier
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Total Fleet Drivers</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">112</p>
          <p className="text-xs text-[#5b7266] mt-1">Registered couriers</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Active On Shift</p>
          <p className="text-2xl font-bold text-[#16a34a] mt-1">86</p>
          <p className="text-xs text-[#16a34a] mt-1">76.8% active utilization</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Currently Delivering</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">54</p>
          <p className="text-xs text-[#5b7266] mt-1">32 available for dispatch</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Average Fleet Rating</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1">
            4.85 <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          </p>
          <p className="text-xs text-[#5b7266] mt-1">From 48k customer reviews</p>
        </div>
      </div>

      {/* Main Roster Card */}
      <SectionCard title="Courier Fleet Roster" subtitle="Real-time shift statuses, vehicle specs, and driver controls">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
              <input
                type="text"
                placeholder="Search driver name, license, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a] text-[#0f2a1d]"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["All", "Motorcycle", "Van", "Bicycle", "Light Truck"].map((veh) => (
                <button
                  key={veh}
                  onClick={() => setVehicleFilter(veh)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    vehicleFilter === veh
                      ? "bg-[#0b3d2a] text-white"
                      : "bg-[#e8f5ec] text-[#0b3d2a] hover:bg-[#d5ecd9]"
                  }`}
                >
                  {veh}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                <tr>
                  <th className="py-3 px-4">Driver Profile</th>
                  <th className="py-3 px-4">Vehicle & License</th>
                  <th className="py-3 px-4">Operating Hub</th>
                  <th className="py-3 px-4">Shift Status</th>
                  <th className="py-3 px-4">Trips & Rating</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eee8]">
                {filteredCouriers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f9fbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0b3d2a] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0f2a1d]">{c.name}</p>
                          <p className="text-xs text-[#5b7266]">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {c.vehicleType === "Motorcycle" && <Bike className="w-4 h-4 text-[#16a34a]" />}
                        {c.vehicleType === "Van" && <Car className="w-4 h-4 text-[#16a34a]" />}
                        {c.vehicleType === "Light Truck" && <Truck className="w-4 h-4 text-[#16a34a]" />}
                        {c.vehicleType === "Bicycle" && <Bike className="w-4 h-4 text-[#16a34a]" />}
                        <div>
                          <p className="text-xs font-semibold text-[#0f2a1d]">{c.vehicleType}</p>
                          <p className="text-xs text-[#5b7266] font-mono">{c.licensePlate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#0f2a1d]">
                      <span className="flex items-center gap-1 text-[#5b7266]">
                        <MapPin className="w-3.5 h-3.5 text-[#16a34a]" /> {c.zone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === "In Delivery"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : c.status === "Available"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {c.status}
                        {c.activeOrder && <span className="font-mono text-[10px]">({c.activeOrder})</span>}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold text-[#0f2a1d]">{c.completedTrips} trips</p>
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {c.rating}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                          Edit
                        </Button>
                        <button
                          title="Deactivate courier"
                          className="p-1.5 hover:bg-red-50 text-[#5b7266] hover:text-red-600 rounded"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
