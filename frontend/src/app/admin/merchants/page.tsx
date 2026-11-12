"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { adminApi, type AdminMerchantDTO } from "@/features/admin/api/admin.api";
import {
  Check,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<AdminMerchantDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadMerchants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMerchants();
      setMerchants(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load merchants from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  const handleApproval = async (merchantId: number, status: "approved" | "rejected") => {
    let reason: string | undefined;
    if (status === "rejected") {
      const input = window.prompt("Please provide a rejection reason:");
      if (input === null) return;
      reason = input || "Did not meet verification requirements";
    }

    setProcessingId(merchantId);
    try {
      await adminApi.updateMerchantApproval(merchantId, status, reason);
      await loadMerchants();
    } catch (err) {
      alert((err as Error).message || "Failed to update merchant status");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = merchants.filter((m) => m.approval_status === "pending");
  const activeList = merchants.filter((m) => m.approval_status === "approved");
  const rejectedList = merchants.filter((m) => m.approval_status === "rejected");

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">Merchant Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Review incoming business onboarding applications, verify registration details, and approve API access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadMerchants} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Pending Approvals</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {loading ? "..." : pendingList.length}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Requires admin verification</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Verified Active</p>
            <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">
            {loading ? "..." : activeList.length}
          </p>
          <p className="text-xs text-[#16a34a] mt-1">Approved storefronts</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Total Applications</p>
            <Store className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">
            {loading ? "..." : merchants.length}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">All registered businesses</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e5eee8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5b7266] font-medium">Rejected</p>
            <X className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-[#0f2a1d] mt-2">
            {loading ? "..." : rejectedList.length}
          </p>
          <p className="text-xs text-[#5b7266] mt-1">Declined applications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5eee8] pb-1">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "pending"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0b3d2a]"
            }`}
        >
          <span>Pending Registrations</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
            {pendingList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "active"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0b3d2a]"
            }`}
        >
          <span>Verified Merchants</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-[#e8f5ec] text-[#0b3d2a]">
            {activeList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "rejected"
              ? "border-[#16a34a] text-[#0b3d2a]"
              : "border-transparent text-[#5b7266] hover:text-[#0b3d2a]"
            }`}
        >
          <span>Rejected</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700">
            {rejectedList.length}
          </span>
        </button>
      </div>

      {/* Content for Pending Tab */}
      {activeTab === "pending" && (
        <SectionCard
          title="Merchant Registration Queue"
          subtitle="Live pending merchant onboarding requests from database"
        >
          {loading ? (
            <div className="py-12 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading pending applications...
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5b7266]">
              All caught up! No pending merchant applications right now.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-xl border border-[#e5eee8] bg-[#fdfefe] hover:border-[#16a34a]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#e8f5ec] text-[#0b3d2a] font-semibold">
                        {m.display_id}
                      </span>
                      <h3 className="text-base font-bold text-[#0f2a1d]">{m.business_name}</h3>
                      {m.business_type && <Badge variant="outline">{m.business_type}</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5b7266]">
                      <span>
                        Owner: <strong className="text-[#0f2a1d]">{m.owner_name}</strong> ({m.email})
                      </span>
                      <span>
                        BRN: <code className="text-[#0f2a1d]">{m.registration_number}</code>
                      </span>
                      <span>Phone: {m.contact_phone}</span>
                      <span>Address: {m.business_address}</span>
                      <span>Submitted: {m.submitted}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processingId === m.id}
                      onClick={() => handleApproval(m.id, "rejected")}
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={processingId === m.id}
                      onClick={() => handleApproval(m.id, "approved")}
                      className="bg-[#16a34a] hover:bg-[#15803d] gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {processingId === m.id ? "Processing..." : "Approve Merchant"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Content for Verified Tab */}
      {activeTab === "active" && (
        <SectionCard
          title="Active Verified Merchants"
          subtitle="Approved merchant partners from database"
        >
          {loading ? (
            <div className="py-12 flex items-center justify-center text-[#5b7266] gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading active merchants...
            </div>
          ) : activeList.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5b7266]">
              No approved merchants yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                  <tr>
                    <th className="py-3 px-4">Merchant Store</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">BRN</th>
                    <th className="py-3 px-4">Phone & Address</th>
                    <th className="py-3 px-4">API Key</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5eee8]">
                  {activeList.map((m) => (
                    <tr key={m.id} className="hover:bg-[#f9fbf9] transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-[#0f2a1d]">{m.business_name}</p>
                          <p className="text-xs text-[#5b7266]">
                            {m.owner_name} • {m.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5b7266]">
                        {m.business_type || "General"}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#0f2a1d]">
                        {m.registration_number}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5b7266]">
                        <p>{m.contact_phone}</p>
                        <p className="truncate max-w-[200px]">{m.business_address}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#16a34a]">
                        {m.api_key ? `${m.api_key.slice(0, 12)}...` : "None"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="success">Approved</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Content for Rejected Tab */}
      {activeTab === "rejected" && (
        <SectionCard title="Rejected Applications" subtitle="Merchants whose applications were declined">
          {rejectedList.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5b7266]">No rejected applications.</div>
          ) : (
            <div className="space-y-3">
              {rejectedList.map((m) => (
                <div key={m.id} className="p-4 rounded-xl border border-red-100 bg-red-50/30 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-[#0f2a1d]">{m.business_name}</p>
                    <p className="text-xs text-[#5b7266]">
                      Owner: {m.owner_name} • Reason: {m.rejection_reason || "N/A"}
                    </p>
                  </div>
                  <Badge variant="destructive">Rejected</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
