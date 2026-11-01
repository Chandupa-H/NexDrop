import Link from "next/link";
import { 
  StatCard, 
  SectionCard 
} from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  ShieldCheck,
  Store,
  Truck,
  Users
} from "lucide-react";

export const metadata = {
  title: "Admin Overview — NexDrop",
  description: "Main administrative landing page and system command center.",
};

const RECENT_ACTIVITY = [
  {
    id: "ACT-8491",
    action: "New Merchant Registered",
    subject: "Colombo Fresh Grocers",
    time: "4 mins ago",
    type: "merchant",
    status: "Pending Review",
    tone: "warning",
  },
  {
    id: "ACT-8490",
    action: "Courier Onboarded",
    subject: "Kamal Perera (Zone B - Central)",
    time: "22 mins ago",
    type: "courier",
    status: "Active",
    tone: "success",
  },
  {
    id: "ACT-8489",
    action: "Zone Surge Activated",
    subject: "Zone A (Colombo 01-03) at 1.25x",
    time: "1 hour ago",
    type: "pricing",
    status: "System Auto",
    tone: "info",
  },
  {
    id: "ACT-8488",
    action: "Dispatcher Assigned",
    subject: "Sara Fernando -> Evening Hub 2",
    time: "2 hours ago",
    type: "dispatcher",
    status: "Completed",
    tone: "neutral",
  },
];

const ZONE_LOAD = [
  { name: "Zone A (Colombo Fort / Kollupitiya)", activeCouriers: 32, pendingParcels: 142, status: "Optimal" },
  { name: "Zone B (Bambalapitiya / Havelock)", activeCouriers: 24, pendingParcels: 98, status: "Normal" },
  { name: "Zone C (Dehiwala / Mount Lavinia)", activeCouriers: 18, pendingParcels: 84, status: "High Demand" },
  { name: "Zone D (Kaduwela / Malabe)", activeCouriers: 12, pendingParcels: 45, status: "Normal" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#0b3d2a] to-[#06291c] rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#b6f36b] text-[#0b3d2a]">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Live
            </span>
            <span className="text-xs text-white/70">Cluster v2.4 • All Systems Operational</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Command Center</h1>
          <p className="text-sm text-white/80 mt-1">
            Real-time logistics monitoring, account administration, and platform operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/merchants">
            <Button variant="lime" size="sm" className="gap-1.5">
              <Store className="w-4 h-4" /> Review Registrations
            </Button>
          </Link>
          <Link href="/admin/couriers">
            <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5">
              <Plus className="w-4 h-4" /> Add Courier
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Deliveries Today"
          value="1,428"
          icon="truck"
          tone="success"
          deltaPct={12.5}
          deltaLabel="vs yesterday"
        />
        <StatCard
          label="Registered Merchants"
          value="348"
          icon="store"
          tone="info"
          deltaPct={4.8}
          deltaLabel="3 pending review"
        />
        <StatCard
          label="Couriers on Shift"
          value="86 / 112"
          icon="users"
          tone="success"
          deltaPct={6.2}
          deltaLabel="76.8% fleet active"
        />
        <StatCard
          label="Today's GMV Revenue"
          value="$18,420"
          icon="dollar-sign"
          tone="success"
          deltaPct={8.3}
          deltaLabel="vs last week"
        />
      </div>

      {/* Main Grid: Zones, Alerts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Zone Fleet Activity */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Live Delivery Zone Status"
            subtitle="Active courier allocation and pending parcel density per operating area"
            action={
              <Link href="/admin/zones" className="text-xs font-semibold text-[#16a34a] hover:underline flex items-center gap-1">
                Configure Zones <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                    <th className="py-2.5 px-3">Zone</th>
                    <th className="py-2.5 px-3">Couriers</th>
                    <th className="py-2.5 px-3">Queue</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5eee8]">
                  {ZONE_LOAD.map((z, idx) => (
                    <tr key={idx} className="hover:bg-[#f9fbf9] transition-colors">
                      <td className="py-3 px-3 font-medium text-[#0f2a1d] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#16a34a]" />
                        {z.name}
                      </td>
                      <td className="py-3 px-3 text-[#5b7266]">{z.activeCouriers} online</td>
                      <td className="py-3 px-3 text-[#0f2a1d] font-semibold">{z.pendingParcels} pkgs</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            z.status === "Optimal"
                              ? "success"
                              : z.status === "Normal"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {z.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href="/admin/zones">
                          <button className="text-xs text-[#16a34a] hover:underline font-medium">
                            Manage
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Platform Audit & Activity Log */}
          <SectionCard
            title="Real-Time System Log"
            subtitle="Audit log of administrative and platform operations"
            action={
              <Link href="/admin/analytics" className="text-xs font-semibold text-[#16a34a] hover:underline flex items-center gap-1">
                Full Report <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="divide-y divide-[#e5eee8]">
              {RECENT_ACTIVITY.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8f5ec] text-[#16a34a] flex items-center justify-center shrink-0">
                      {act.type === "merchant" && <Store className="w-4 h-4" />}
                      {act.type === "courier" && <Truck className="w-4 h-4" />}
                      {act.type === "pricing" && <Clock className="w-4 h-4" />}
                      {act.type === "dispatcher" && <Users className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0f2a1d]">{act.action}</p>
                      <p className="text-xs text-[#5b7266]">{act.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs text-[#5b7266]">{act.time}</span>
                    <Badge variant={act.tone === "warning" ? "secondary" : "success"}>
                      {act.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right Column (1 col): Pending Actions & Quick Links */}
        <div className="space-y-6">
          <SectionCard
            title="Action Required"
            subtitle="Items awaiting administrator intervention"
          >
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-[#9a5b00]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">3 Merchant Approvals</p>
                    <p className="text-xs mt-0.5 text-amber-800">
                      New business document submissions require KYC verification.
                    </p>
                    <Link href="/admin/merchants" className="inline-block mt-2 text-xs font-semibold text-amber-900 underline">
                      Review Merchants →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-5 h-5 shrink-0 mt-0.5 text-[#5b7266]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[#0f2a1d] tracking-wide">Courier License Renewal</p>
                    <p className="text-xs mt-0.5 text-[#5b7266]">
                      2 courier drivers have vehicle insurance expiring in 7 days.
                    </p>
                    <Link href="/admin/couriers" className="inline-block mt-2 text-xs font-semibold text-[#16a34a] underline">
                      Inspect Couriers →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#16a34a]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[#0f2a1d] tracking-wide">Dispatcher Shift Change</p>
                    <p className="text-xs mt-0.5 text-[#5b7266]">
                      Shift hand-off completed smoothly at 18:00 across all 4 hubs.
                    </p>
                    <Link href="/admin/dispatchers" className="inline-block mt-2 text-xs font-semibold text-[#16a34a] underline">
                      View Dispatchers →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Quick Admin Navigation */}
          <SectionCard
            title="Management Shortcuts"
            subtitle="Fast navigation to primary consoles"
          >
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/users" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <Users className="w-5 h-5 text-[#16a34a]" />
                <span className="text-xs font-medium text-[#0f2a1d]">Users</span>
              </Link>
              <Link href="/admin/merchants" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <Store className="w-5 h-5 text-[#16a34a]" />
                <span className="text-xs font-medium text-[#0f2a1d]">Merchants</span>
              </Link>
              <Link href="/admin/zones" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <MapPin className="w-5 h-5 text-[#16a34a]" />
                <span className="text-xs font-medium text-[#0f2a1d]">Delivery Zones</span>
              </Link>
              <Link href="/admin/pricing" className="p-3 rounded-xl border border-[#e5eee8] hover:border-[#16a34a] hover:bg-[#f2f7f3] transition-all flex flex-col items-center text-center gap-1.5">
                <span className="font-bold text-[#16a34a] text-base leading-none">$</span>
                <span className="text-xs font-medium text-[#0f2a1d]">Pricing</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
