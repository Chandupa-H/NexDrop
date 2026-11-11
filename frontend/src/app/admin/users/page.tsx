"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { adminApi, type AdminUserDTO } from "@/features/admin/api/admin.api";
import {
  CheckCircle2,
  Download,
  Loader2,
  Power,
  RefreshCw,
  Search,
  UserPlus,
  XCircle,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load users from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (userId: number) => {
    setTogglingId(userId);
    try {
      const updated = await adminApi.toggleUserStatus(userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: updated.is_active, status: updated.status } : u
        )
      );
    } catch (err) {
      alert((err as Error).message || "Failed to update user status");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole =
      selectedRole === "All" || user.role.toLowerCase() === selectedRole.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const countByRole = (r: string) =>
    users.filter((u) => u.role.toLowerCase() === r.toLowerCase()).length;

  const exportCsv = () => {
    const headers = ["ID", "Name", "Email", "Phone", "Role", "Status", "Joined"];
    const rows = filteredUsers.map((u) => [
      u.display_id,
      `"${u.name}"`,
      u.email,
      u.phone || "",
      u.role,
      u.status,
      u.joined,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexdrop-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Users", count: users.length },
          { label: "Merchants", count: countByRole("merchant") },
          { label: "Couriers", count: countByRole("courier") },
          { label: "Dispatchers", count: countByRole("dispatcher") },
          { label: "Administrators", count: countByRole("admin") },
        ].map((m, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-white border border-[#e5eee8]">
            <p className="text-xs text-[#5b7266] font-medium">{m.label}</p>
            <p className="text-xl font-bold text-[#0f2a1d] mt-1">
              {loading ? "..." : m.count}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <SectionCard title="Platform User Directory" subtitle="Live accounts fetched from PostgreSQL">
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${selectedRole === role
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#5b7266] text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
                      </span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
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
                        {u.phone || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                        >
                          {u.is_active ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5b7266]">{u.joined}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingId === u.id}
                          onClick={() => handleToggleStatus(u.id)}
                          className="text-xs gap-1.5"
                        >
                          <Power className="w-3.5 h-3.5" />
                          {togglingId === u.id
                            ? "Updating..."
                            : u.is_active
                              ? "Suspend"
                              : "Activate"}
                        </Button>
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
