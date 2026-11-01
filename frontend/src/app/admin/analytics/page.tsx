"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  Truck, 
  XCircle 
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("Last 30 Days");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Reports & Analytics</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Monitor platform-wide delivery metrics, courier SLA compliance, delivery turnaround times, and logistics volume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-[#e5eee8] rounded-lg p-1 text-xs">
            {["Today", "7 Days", "Last 30 Days", "Quarter"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  timeRange === t
                    ? "bg-[#0b3d2a] text-white font-semibold"
                    : "text-[#5b7266] hover:bg-[#e8f5ec]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]">
            <Download className="w-4 h-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Total Deliveries</span>
            <Truck className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">28,490</p>
          <p className="text-xs text-[#16a34a] font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2% vs previous period
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Gross Logistics GMV</span>
            <span className="text-xs font-bold text-[#16a34a]">$</span>
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">$384,200</p>
          <p className="text-xs text-[#16a34a] font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +9.8% month-over-month
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">On-Time SLA Rate</span>
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#16a34a] mt-2">98.4%</p>
          <p className="text-xs text-[#5b7266] mt-1">Target is 98.0% minimum</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5eee8] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5b7266] uppercase">Avg Fulfillment Time</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">27.4 mins</p>
          <p className="text-xs text-[#16a34a] mt-1">2.1 mins faster than benchmark</p>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Fulfillment Status & Performance */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Delivery Fulfillment Performance"
            subtitle="Breakdown of parcel dispatch lifecycle and outcome distribution"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="p-3 bg-[#e8f5ec] rounded-xl text-center">
                  <p className="text-[11px] text-[#0b3d2a] font-semibold">Delivered</p>
                  <p className="text-lg font-bold text-[#16a34a] mt-0.5">27,840</p>
                  <p className="text-[10px] text-[#5b7266]">97.7%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-[11px] text-blue-900 font-semibold">In Transit</p>
                  <p className="text-lg font-bold text-blue-600 mt-0.5">420</p>
                  <p className="text-[10px] text-blue-700">1.5%</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <p className="text-[11px] text-amber-900 font-semibold">Returned</p>
                  <p className="text-lg font-bold text-amber-600 mt-0.5">180</p>
                  <p className="text-[10px] text-amber-700">0.6%</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-center">
                  <p className="text-[11px] text-red-900 font-semibold">Failed / Void</p>
                  <p className="text-lg font-bold text-red-600 mt-0.5">50</p>
                  <p className="text-[10px] text-red-700">0.2%</p>
                </div>
              </div>

              {/* Progress visual bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-[#5b7266]">
                  <span>Fulfillment Ratio</span>
                  <span className="font-semibold text-[#0f2a1d]">27,840 / 28,490 successful</span>
                </div>
                <div className="h-3 w-full bg-[#e5eee8] rounded-full overflow-hidden flex">
                  <div style={{ width: "97.7%" }} className="bg-[#16a34a] h-full" />
                  <div style={{ width: "1.5%" }} className="bg-blue-500 h-full" />
                  <div style={{ width: "0.6%" }} className="bg-amber-400 h-full" />
                  <div style={{ width: "0.2%" }} className="bg-red-500 h-full" />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Top Merchant Volume Table */}
          <SectionCard
            title="Top Volume Merchants"
            subtitle="Leading business partners by orders dispatched this period"
          >
            <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Merchant Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Total Parcels</th>
                    <th className="py-2.5 px-3">Volume (USD)</th>
                    <th className="py-2.5 px-3">SLA Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5eee8]">
                  {[
                    { name: "Urban Gourmet Deli", cat: "Bakery & Food", count: "3,840", gmv: "$58,400", sla: "99.1%" },
                    { name: "ElectroMart Online", cat: "Electronics", count: "2,910", gmv: "$92,100", sla: "98.6%" },
                    { name: "Colombo Fresh Grocers", cat: "Grocery", count: "2,450", gmv: "$36,700", sla: "97.8%" },
                    { name: "Lanka Pharma Care", cat: "Healthcare", count: "1,880", gmv: "$28,500", sla: "99.5%" },
                  ].map((m, i) => (
                    <tr key={i} className="hover:bg-[#f9fbf9]">
                      <td className="py-3 px-3 font-semibold text-[#0f2a1d]">{m.name}</td>
                      <td className="py-3 px-3 text-xs text-[#5b7266]">{m.cat}</td>
                      <td className="py-3 px-3 text-xs font-bold text-[#0f2a1d]">{m.count}</td>
                      <td className="py-3 px-3 text-xs font-semibold text-[#16a34a]">{m.gmv}</td>
                      <td className="py-3 px-3 text-xs font-semibold text-[#0b3d2a]">{m.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Zone Latency & Quick Reports */}
        <div className="space-y-6">
          <SectionCard
            title="Zone Latency Performance"
            subtitle="Average dispatch to delivery turnaround per zone"
          >
            <div className="space-y-3">
              {[
                { zone: "Zone A (Fort / Galle Face)", time: "24.1 mins", status: "Fast" },
                { zone: "Zone B (Bambalapitiya)", time: "28.3 mins", status: "Normal" },
                { zone: "Zone C (Dehiwala)", time: "34.0 mins", status: "Normal" },
                { zone: "Zone D (Malabe / Suburbs)", time: "38.2 mins", status: "Moderate" },
              ].map((z, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[#e5eee8] bg-[#fdfefe] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0f2a1d]">{z.zone}</p>
                    <p className="text-xs text-[#5b7266] mt-0.5">{z.time} avg</p>
                  </div>
                  <Badge variant="success">{z.status}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Download Custom Audits"
            subtitle="Pre-formatted accounting and tax statements"
          >
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs py-2">
                <span>Monthly Merchant Payouts.csv</span>
                <Download className="w-3.5 h-3.5 text-[#16a34a]" />
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-between text-xs py-2">
                <span>Courier Earnings & Fuel Tariffs.xlsx</span>
                <Download className="w-3.5 h-3.5 text-[#16a34a]" />
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-between text-xs py-2">
                <span>Platform SLA & Incident Report.pdf</span>
                <Download className="w-3.5 h-3.5 text-[#16a34a]" />
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
