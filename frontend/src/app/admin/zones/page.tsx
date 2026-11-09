"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  AlertCircle, 
  Layers, 
  MapPin, 
  Plus, 
  Settings2, 
  Sliders, 
  Truck, 
  Zap 
} from "lucide-react";

const ZONES = [
  {
    id: "ZONE-A",
    name: "Zone A - Colombo Central & Fort",
    code: "LK-COL-A",
    postcodes: "Colombo 01, 02, 03, 10",
    hub: "Central Colombo Hub",
    baseFee: "$3.50",
    avgDeliveryTime: "24 mins",
    activeCouriers: 32,
    status: "Active",
    surgeMultiplier: "1.25x (Peak)",
  },
  {
    id: "ZONE-B",
    name: "Zone B - South Urban (Bambalapitiya & Havelock)",
    code: "LK-COL-B",
    postcodes: "Colombo 04, 05, 06, 07",
    hub: "Central Colombo Hub",
    baseFee: "$3.50",
    avgDeliveryTime: "28 mins",
    activeCouriers: 24,
    status: "Active",
    surgeMultiplier: "1.0x (Standard)",
  },
  {
    id: "ZONE-C",
    name: "Zone C - Coastal Corridor (Dehiwala & Mount)",
    code: "LK-COL-C",
    postcodes: "Dehiwala, Mount Lavinia, Ratmalana",
    hub: "South Metro Hub",
    baseFee: "$4.20",
    avgDeliveryTime: "34 mins",
    activeCouriers: 18,
    status: "Active",
    surgeMultiplier: "1.0x (Standard)",
  },
  {
    id: "ZONE-D",
    name: "Zone D - Tech & Eastern Suburbs (Malabe & Battaramulla)",
    code: "LK-COL-D",
    postcodes: "Battaramulla, Malabe, Kaduwela",
    hub: "Eastern Suburbs Hub",
    baseFee: "$4.50",
    avgDeliveryTime: "38 mins",
    activeCouriers: 12,
    status: "Active",
    surgeMultiplier: "1.0x (Standard)",
  },
  {
    id: "ZONE-E",
    name: "Zone E - Northern Perimeter (Wattala & Peliyagoda)",
    code: "LK-COL-E",
    postcodes: "Wattala, Kelaniya, Peliyagoda",
    hub: "North Corridor Hub",
    baseFee: "$4.80",
    avgDeliveryTime: "42 mins",
    activeCouriers: 8,
    status: "Testing Phase",
    surgeMultiplier: "1.0x (Standard)",
  },
];

export default function AdminDeliveryZonesPage() {
  const [zonesList, setZonesList] = useState(ZONES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Delivery Zone Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Configure geographic coverage perimeters, dispatch hubs, base delivery SLAs, and regional surge rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Layers className="w-4 h-4" /> Import GeoJSON
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]">
            <Plus className="w-4 h-4" /> Create New Zone
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Covered Zones</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">5 Active</p>
          <p className="text-xs text-[#5b7266] mt-1">1 upcoming expansion</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Operating Hubs</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">4 Centers</p>
          <p className="text-xs text-[#5b7266] mt-1">Full 24/7 sorting capability</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Avg Delivery SLA</p>
          <p className="text-2xl font-bold text-[#16a34a] mt-1">29.2 mins</p>
          <p className="text-xs text-[#16a34a] mt-1">Under 45m target</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Dynamic Surge</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1">
            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" /> 1 Zone Peak
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Zone A high density</p>
        </div>
      </div>

      {/* Zone Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zonesList.map((z) => (
          <div
            key={z.id}
            className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm hover:border-[#16a34a]/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-[#16a34a] bg-[#e8f5ec] px-2 py-0.5 rounded">
                    {z.code}
                  </span>
                  <h3 className="text-base font-bold text-[#0f2a1d] mt-1.5">{z.name}</h3>
                </div>
                <Badge variant={z.status === "Active" ? "success" : "secondary"}>
                  {z.status}
                </Badge>
              </div>

              <div className="mt-3 space-y-2 text-xs text-[#5b7266]">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                  <span>Coverage: <strong className="text-[#0f2a1d]">{z.postcodes}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#5b7266] shrink-0" />
                  <span>Assigned Hub: <strong className="text-[#0f2a1d]">{z.hub}</strong></span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#e5eee8] grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#f9fbf9] p-2 rounded-lg">
                  <p className="text-[10px] text-[#5b7266] uppercase">Base Fee</p>
                  <p className="text-sm font-bold text-[#0f2a1d]">{z.baseFee}</p>
                </div>
                <div className="bg-[#f9fbf9] p-2 rounded-lg">
                  <p className="text-[10px] text-[#5b7266] uppercase">Avg Delivery</p>
                  <p className="text-sm font-bold text-[#0f2a1d]">{z.avgDeliveryTime}</p>
                </div>
                <div className="bg-[#f9fbf9] p-2 rounded-lg">
                  <p className="text-[10px] text-[#5b7266] uppercase">Couriers</p>
                  <p className="text-sm font-bold text-[#16a34a]">{z.activeCouriers} online</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#e5eee8]">
              <div className="flex items-center gap-1 text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[#5b7266]">Rate: </span>
                <span className="font-semibold text-[#0f2a1d]">{z.surgeMultiplier}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                  Edit Boundary
                </Button>
                <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                  Settings
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
