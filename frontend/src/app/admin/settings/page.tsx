"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Bell, 
  Check, 
  Database, 
  Globe, 
  Lock, 
  Save, 
  Server, 
  ShieldAlert, 
  Sliders, 
  Zap 
} from "lucide-react";

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [maxCourierBatch, setMaxCourierBatch] = useState("4");
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">System Settings</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Manage platform-wide configuration, automated dispatch engines, notification gateways, and security policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-[#b6f36b]" /> Settings Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Platform & Operational Mode */}
        <SectionCard
          title="Platform Operational Mode"
          subtitle="Global system availability and maintenance triggers"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#e5eee8] bg-[#f9fbf9] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0f2a1d]">Maintenance Mode</p>
                <p className="text-xs text-[#5b7266] mt-0.5">
                  Temporarily pause customer checkout while couriers complete existing active deliveries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  maintenanceMode ? "bg-red-600" : "bg-[#cbd5e1]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    maintenanceMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[#e5eee8] bg-[#f9fbf9] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0f2a1d]">Auto-Dispatch AI Engine</p>
                <p className="text-xs text-[#5b7266] mt-0.5">
                  Automatically assign parcels to nearest couriers via Dijkstra routing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoDispatch(!autoDispatch)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoDispatch ? "bg-[#16a34a]" : "bg-[#cbd5e1]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoDispatch ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Max Concurrent Parcels per Courier Batch
              </label>
              <input
                type="number"
                value={maxCourierBatch}
                onChange={(e) => setMaxCourierBatch(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
              />
              <p className="text-[11px] text-[#5b7266] mt-1">Prevents courier overload during peak periods.</p>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Gateways & External Integrations */}
        <SectionCard
          title="External Integrations & Gateways"
          subtitle="Status of active communication and mapping infrastructure"
        >
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  SMS
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f2a1d]">Twilio SMS Gateway</p>
                  <p className="text-[11px] text-[#5b7266]">OTP delivery verification & notifications</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  MAP
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f2a1d]">OpenStreetMap & OSRM Routing</p>
                  <p className="text-[11px] text-[#5b7266]">Courier maps, road routes, and distance estimates</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                  MAIL
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f2a1d]">SendGrid Transactional Email</p>
                  <p className="text-[11px] text-[#5b7266]">Merchant reports and receipts</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5eee8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                  FCM
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f2a1d]">Firebase Cloud Messaging (Push)</p>
                  <p className="text-[11px] text-[#5b7266]">Instant courier dispatch alerts</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Security & Session Policies */}
        <SectionCard
          title="Security & Session Policy"
          subtitle="Administrative session longevity and security controls"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Admin Session Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
              />
              <p className="text-[11px] text-[#5b7266] mt-1">Logs out inactive admins after this duration.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Audit Log Retention Policy
              </label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]">
                <option>365 Days (Compliance Standard)</option>
                <option>180 Days</option>
                <option>90 Days</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Section 4: System Information & Cluster Health */}
        <SectionCard
          title="Cluster Environment"
          subtitle="Host infrastructure and software versions"
        >
          <div className="p-4 rounded-xl bg-[#f2f7f3] space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#e5eee8]">
              <span className="text-[#5b7266]">Platform Release</span>
              <span className="font-semibold text-[#0f2a1d]">NexDrop v2.4.0 (Enterprise)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e5eee8]">
              <span className="text-[#5b7266]">Environment</span>
              <Badge variant="success">Production Cluster</Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e5eee8]">
              <span className="text-[#5b7266]">Database Engine</span>
              <span className="font-semibold text-[#0f2a1d]">PostgreSQL 16 + PostGIS</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5b7266]">Uptime</span>
              <span className="font-semibold text-[#16a34a]">99.98% (42 days continuous)</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
