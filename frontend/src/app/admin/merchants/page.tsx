"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Building2, 
  Check, 
  FileText, 
  Search, 
  Store, 
  X, 
  Eye, 
  SlidersHorizontal,
  Clock,
  ShieldCheck
} from "lucide-react";

const PENDING_MERCHANTS = [
  {
    id: "MREG-901",
    businessName: "Colombo Organic Supermarket",
    ownerName: "Damith Silva",
    category: "Grocery & Produce",
    brn: "PV-2026-9921",
    submitted: "Today, 14:20",
    docsCount: 3,
    status: "Pending Review",
  },
  {
    id: "MREG-902",
    businessName: "Lanka Pharma Care Ltd",
    ownerName: "Dr. Anoma Jayasuriya",
    category: "Healthcare & Pharmacy",
    brn: "PV-2025-4100",
    submitted: "Yesterday, 09:15",
    docsCount: 4,
    status: "Documents Under Review",
  },
  {
    id: "MREG-903",
    businessName: "Kandy Ceylon Spices Exporters",
    ownerName: "Roshan Bandara",
    category: "Specialty Foods",
    brn: "PV-2026-1182",
    submitted: "2 days ago",
    docsCount: 3,
    status: "Awaiting Admin Signoff",
  },
];

const ACTIVE_MERCHANTS = [
  {
    id: "MRC-0012",
    businessName: "Urban Gourmet Deli",
    ownerName: "Sarah Alwis",
    category: "Bakery & Cafe",
    commission: "8.5%",
    orders: 1420,
    rating: "4.9",
    status: "Active",
  },
  {
    id: "MRC-0015",
    businessName: "ElectroMart Online",
    ownerName: "J. K. Perera",
    category: "Electronics",
    commission: "6.0%",
    orders: 3840,
    rating: "4.8",
    status: "Active",
  },
  {
    id: "MRC-0021",
    businessName: "Himalaya Herbal Botanicals",
    ownerName: "Menaka Senanayake",
    category: "Health & Beauty",
    commission: "9.0%",
    orders: 890,
    rating: "4.7",
    status: "Active",
  },
];

export default function AdminMerchantsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [reviewedId, setReviewedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Merchant Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Review incoming business onboarding applications, verify KYC docs, and manage merchant commission tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="w-4 h-4" /> Commission Rules
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]">
            <Store className="w-4 h-4" /> Invite Merchant
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Pending Approvals</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">3</p>
          <p className="text-xs text-[#5b7266] mt-1">Requires KYC verification</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Verified Active</p>
            <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">341</p>
          <p className="text-xs text-[#16a34a] mt-1">+12 joined this month</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Monthly Merchant GMV</p>
            <span className="text-xs font-bold text-[#16a34a]">$</span>
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">$142,500</p>
          <p className="text-xs text-[#5b7266] mt-1">Across 341 storefronts</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Avg Review SLA</p>
            <Clock className="w-4 h-4 text-[#5b7266]" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">4.2 hrs</p>
          <p className="text-xs text-[#16a34a] mt-1">Well within 24h SLA target</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5eee8] pb-1">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0b3d2a]"
          }`}
        >
          <span>Pending Registrations</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
            3
          </span>
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "active"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0b3d2a]"
          }`}
        >
          <span>Verified Merchants</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-[#e8f5ec] text-[#0b3d2a]">
            341
          </span>
        </button>
      </div>

      {/* Content for Pending Tab */}
      {activeTab === "pending" && (
        <SectionCard
          title="Merchant Registration Queue"
          subtitle="Review submitted company documents, tax IDs, and approve or request information"
        >
          <div className="space-y-4">
            {PENDING_MERCHANTS.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-xl border border-[#e5eee8] bg-[#fdfefe] hover:border-[#16a34a]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#e8f5ec] text-[#0b3d2a] font-semibold">
                      {m.id}
                    </span>
                    <h3 className="text-base font-bold text-[#0f2a1d]">{m.businessName}</h3>
                    <Badge variant="outline">{m.category}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5b7266]">
                    <span>Owner: <strong className="text-[#0f2a1d]">{m.ownerName}</strong></span>
                    <span>BRN: <code className="text-[#0f2a1d]">{m.brn}</code></span>
                    <span>Submitted: {m.submitted}</span>
                    <span className="flex items-center gap-1 text-[#16a34a]">
                      <FileText className="w-3.5 h-3.5" /> {m.docsCount} verification files
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Eye className="w-4 h-4" /> View Docs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                  >
                    <X className="w-4 h-4" /> Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setReviewedId(m.id)}
                    className="bg-[#16a34a] hover:bg-[#15803d] gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {reviewedId === m.id ? "Approved!" : "Approve Merchant"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Content for Verified Tab */}
      {activeTab === "active" && (
        <SectionCard
          title="Active Verified Merchants"
          subtitle="Directory of approved merchant partners and commission settings"
        >
          <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                <tr>
                  <th className="py-3 px-4">Merchant Store</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Delivered Orders</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eee8]">
                {ACTIVE_MERCHANTS.map((m) => (
                  <tr key={m.id} className="hover:bg-[#f9fbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-[#0f2a1d]">{m.businessName}</p>
                        <p className="text-xs text-[#5b7266]">{m.ownerName}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5b7266]">{m.category}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#16a34a]">{m.commission}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-[#0f2a1d]">{m.orders} pkgs</td>
                    <td className="py-3.5 px-4 text-xs font-bold text-amber-600">★ {m.rating}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                        Configure
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
