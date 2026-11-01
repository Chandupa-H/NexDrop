"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Check, 
  KeyRound, 
  Lock, 
  LogOut, 
  Mail, 
  Phone, 
  Save, 
  ShieldCheck, 
  Smartphone, 
  User 
} from "lucide-react";

export default function AdminProfilePage() {
  const [name, setName] = useState("Alex Vance");
  const [email, setEmail] = useState("alex.admin@nexdrop.io");
  const [phone, setPhone] = useState("+94 77 000 1122");
  const [title, setTitle] = useState("Director of Logistics Technology");
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
          <h1 className="text-2xl font-bold text-[#0f2a1d]">My Profile</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Manage your administrator credentials, personal contact information, and authentication security.
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
                <Check className="w-4 h-4 text-[#b6f36b]" /> Profile Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b3d2a] to-[#08422d] text-white flex flex-col sm:flex-row items-center gap-6 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-[#b6f36b] text-[#0b3d2a] font-black text-2xl flex items-center justify-center shadow-inner">
          AV
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl font-bold">{name}</h2>
            <Badge variant="lime">Super Administrator</Badge>
          </div>
          <p className="text-sm text-white/80">{title}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-white/70 pt-1">
            <span>Admin ID: <strong className="text-white">ADM-ROOT-001</strong></span>
            <span>Platform Role: <strong className="text-white">Cluster Admin</strong></span>
            <span>Joined: <strong className="text-white">January 2026</strong></span>
          </div>
        </div>
      </div>

      {/* Details & Security Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Personal Information Form */}
        <SectionCard
          title="Account Details"
          subtitle="Update your contact info and administrative display identity"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Direct Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                Job Title / Position
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
              />
            </div>
          </form>
        </SectionCard>

        {/* Right Column: Security & Authentication */}
        <div className="space-y-6">
          <SectionCard
            title="Authentication & Security"
            subtitle="Multi-factor authentication and session controls"
          >
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#16a34a]" />
                  <div>
                    <p className="text-xs font-bold text-[#0b3d2a]">Two-Factor Authentication (2FA)</p>
                    <p className="text-xs text-[#5b7266]">Enabled via Hardware Authenticator App (TOTP)</p>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                  Change Password
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
                    <input
                      type="password"
                      placeholder="Current password"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
                    <input
                      type="password"
                      placeholder="New password (minimum 12 chars)"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold text-[#0f2a1d] mb-2">Active Admin Sessions</p>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#0f2a1d]">Chrome on Windows 11 (Current)</p>
                      <p className="text-[#5b7266]">Colombo, Sri Lanka • IP: 175.157.84.12</p>
                    </div>
                    <Badge variant="success">This Device</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#0f2a1d]">NexDrop Admin Mobile (iOS)</p>
                      <p className="text-[#5b7266]">Active 3 hours ago</p>
                    </div>
                    <button className="text-red-600 hover:underline font-medium">Revoke</button>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
