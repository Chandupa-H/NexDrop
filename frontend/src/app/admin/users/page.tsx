"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { 
  Search, 
  UserPlus, 
  Download, 
  Filter, 
  MoreHorizontal, 
  ShieldAlert, 
  KeyRound, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

const SAMPLE_USERS = [
  {
    id: "USR-00101",
    name: "Kasun Jayawardena",
    email: "kasun.j@example.com",
    phone: "+94 77 123 4567",
    role: "Merchant",
    status: "Active",
    joined: "12 Oct 2026",
    deliveries: 420,
  },
  {
    id: "USR-00102",
    name: "Nimal Silva",
    email: "nimal.courier@nexdrop.io",
    phone: "+94 71 987 6543",
    role: "Courier",
    status: "Active",
    joined: "05 Nov 2026",
    deliveries: 1280,
  },
  {
    id: "USR-00103",
    name: "Sara Fernando",
    email: "sara.f@nexdrop.io",
    phone: "+94 76 555 1212",
    role: "Dispatcher",
    status: "Active",
    joined: "18 Aug 2026",
    deliveries: "-",
  },
  {
    id: "USR-00104",
    name: "Dinesh Rodrigo",
    email: "dinesh.rodrigo@gmail.com",
    phone: "+94 70 334 9911",
    role: "Customer",
    status: "Active",
    joined: "22 Sep 2026",
    deliveries: 34,
  },
  {
    id: "USR-00105",
    name: "Pradeep Weerasinghe",
    email: "pradeep@quickstore.lk",
    phone: "+94 72 445 7788",
    role: "Merchant",
    status: "Pending",
    joined: "Yesterday",
    deliveries: 0,
  },
  {
    id: "USR-00106",
    name: "Ruwan Wickrama",
    email: "ruwan.suspended@gmail.com",
    phone: "+94 78 889 0012",
    role: "Courier",
    status: "Suspended",
    joined: "14 Jul 2026",
    deliveries: 94,
  },
  {
    id: "USR-00107",
    name: "Alex Vance",
    email: "alex.admin@nexdrop.io",
    phone: "+94 77 000 1122",
    role: "Admin",
    status: "Active",
    joined: "01 Jan 2026",
    deliveries: "-",
  },
];

export default function AdminUsersPage() {
  const [selectedRole, setSelectedRole] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = SAMPLE_USERS.filter((user) => {
    const matchesRole = selectedRole === "All" || user.role === selectedRole;
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2a1d]">User Management</h1>
          <p className="text-sm text-[#5b7266] mt-0.5">
            Manage all platform accounts, roles, access permissions, and account statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Users", count: "1,842" },
          { label: "Merchants", count: "348" },
          { label: "Couriers", count: "112" },
          { label: "Dispatchers", count: "24" },
          { label: "Administrators", count: "4" },
        ].map((m, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-white border border-[#e5eee8]">
            <p className="text-xs text-[#5b7266] font-medium">{m.label}</p>
            <p className="text-xl font-bold text-[#0f2a1d] mt-1">{m.count}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <SectionCard title="Platform User Directory" subtitle="Filter and inspect accounts across all user types">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b7266]" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a] text-[#0f2a1d]"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
              {["All", "Customer", "Merchant", "Courier", "Dispatcher", "Admin"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                    selectedRole === role
                      ? "bg-[#0b3d2a] text-white"
                      : "bg-[#e8f5ec] text-[#0b3d2a] hover:bg-[#d5ecd9]"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[#e5eee8] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f7f3] border-b border-[#e5eee8] text-xs text-[#5b7266] uppercase">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eee8]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#5b7266] text-sm">
                      No users match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f9fbf9] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#e8f5ec] text-[#0b3d2a] font-bold text-xs flex items-center justify-center shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0f2a1d]">{u.name}</p>
                            <p className="text-xs text-[#5b7266]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            u.role === "Admin"
                              ? "default"
                              : u.role === "Courier"
                              ? "lime"
                              : u.role === "Merchant"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#0f2a1d]">
                        {u.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : u.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {u.status === "Active" && <CheckCircle2 className="w-3 h-3" />}
                          {u.status === "Suspended" && <XCircle className="w-3 h-3" />}
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5b7266]">
                        {u.joined}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Reset password"
                            className="p-1.5 hover:bg-[#e8f5ec] rounded text-[#5b7266] hover:text-[#0b3d2a]"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            title="Account options"
                            className="p-1.5 hover:bg-[#e8f5ec] rounded text-[#5b7266] hover:text-[#0b3d2a]"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
