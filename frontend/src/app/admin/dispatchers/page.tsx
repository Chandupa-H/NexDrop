"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Plus, 
  Radio, 
  Search, 
  Shield, 
  UserCheck, 
  Users 
} from "lucide-react";

const DISPATCHERS = [
  {
    id: "DSP-01",
    name: "Sara Fernando",
    email: "sara.f@nexdrop.io",
    phone: "+94 77 990 1122",
    hub: "Central Colombo Hub (Zones A & B)",
    assignedCouriers: 36,
    shift: "Evening Shift (14:00 - 22:00)",
    status: "On Duty",
    incidentsHandled: 4,
  },
  {
    id: "DSP-02",
    name: "Mohan Wijesinghe",
    email: "mohan.w@nexdrop.io",
    phone: "+94 71 334 5566",
    hub: "South Metro Hub (Zone C)",
    assignedCouriers: 24,
    shift: "Evening Shift (14:00 - 22:00)",
    status: "On Duty",
    incidentsHandled: 1,
  },
  {
    id: "DSP-03",
    name: "Dineli Jayawardena",
    email: "dineli.j@nexdrop.io",
    phone: "+94 76 881 2233",
    hub: "Eastern Suburbs Hub (Zone D)",
    assignedCouriers: 18,
    shift: "Evening Shift (14:00 - 22:00)",
    status: "On Duty",
    incidentsHandled: 0,
  },
  {
    id: "DSP-04",
    name: "Kavindu Perera",
    email: "kavindu.p@nexdrop.io",
    phone: "+94 70 445 6677",
    hub: "Central Colombo Hub (Zones A & B)",
    assignedCouriers: 36,
    shift: "Morning Shift (06:00 - 14:00)",
    status: "Off Duty",
    incidentsHandled: 8,
  },
];

export default function AdminDispatchersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = DISPATCHERS.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hub.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Dispatcher Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Create, assign hub territories, manage shifts, and monitor operational dispatchers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]">
            <Plus className="w-4 h-4" /> Create Dispatcher Account
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Active Dispatchers Now</p>
          <p className="text-2xl font-bold text-[#16a34a] mt-1">3 On Duty</p>
          <p className="text-xs text-[#5b7266] mt-1">Covering all active delivery hubs</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Total Dispatch Personnel</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">24 Accounts</p>
          <p className="text-xs text-[#5b7266] mt-1">3-shift 24/7 rotation</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Courier-to-Dispatcher Ratio</p>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-1">26 : 1</p>
          <p className="text-xs text-[#16a34a] mt-1">Within optimal safety benchmark</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <p className="text-xs text-[#5b7266] font-medium">Avg Escalation Response</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">1.8 mins</p>
          <p className="text-xs text-[#5b7266] mt-1">Target is under 3 mins</p>
        </div>
      </div>

      {/* Directory Section */}
      <SectionCard title="Operational Dispatch Officers" subtitle="Assigned logistics hubs and supervisory authority">
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
            <input
              type="text"
              placeholder="Search dispatcher or hub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a] text-[#0f2a1d]"
            />
          </div>

          <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                <tr>
                  <th className="py-3 px-4">Dispatcher Profile</th>
                  <th className="py-3 px-4">Assigned Delivery Hub</th>
                  <th className="py-3 px-4">Supervised Couriers</th>
                  <th className="py-3 px-4">Current Shift</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eee8]">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-[#f9fbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#16a34a]/10 text-[#16a34a] font-bold text-xs flex items-center justify-center shrink-0">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#0f2a1d]">{d.name}</p>
                          <p className="text-xs text-[#5b7266]">{d.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-xs text-[#0f2a1d] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#16a34a]" /> {d.hub}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#0f2a1d]">
                      {d.assignedCouriers} Couriers
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5b7266]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {d.shift}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={d.status === "On Duty" ? "success" : "secondary"}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                          Reassign Hub
                        </Button>
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
