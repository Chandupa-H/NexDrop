"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard";
import { EditUserModal } from "@/features/admin/components/EditUserModal";
import {
  adminApi,
  type AdminUserDTO,
  type AdminUserCreateDTO,
} from "@/features/admin/api/admin.api";
import {
  CheckCircle2,
  Download,
  Loader2,
  Power,
  Pencil,
  RefreshCw,
  Search,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";

const INITIAL_FORM: AdminUserCreateDTO = {
  full_name: "",
  email: "",
  password: "",
  role: "customer",
  is_active: true,
  phone: "",
  vehicle_type: "motorcycle",
  license_plate: "",
  business_name: "",
  registration_number: "",
  business_address: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserDTO | null>(null);

  // Add User modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AdminUserCreateDTO>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await adminApi.createUser(form);
      setUsers((prev) => [created, ...prev]);
      setShowAddModal(false);
      setForm(INITIAL_FORM);
    } catch (err) {
      setCreateError((err as Error).message || "Failed to create user");
    } finally {
      setCreating(false);
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
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)}
        onSaved={(updated) => setUsers((users) => users.map((user) => user.id === updated.id ? updated : user))} />}
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
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateError(null);
              setShowAddModal(true);
            }}
            className="gap-1.5 bg-[#0b3d2a] hover:bg-[#124d35]"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0f2a1d]">Add New User</h2>
                <p className="text-xs text-[#5b7266]">
                  Create a new user account directly in PostgreSQL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#5b7266] hover:text-[#0f2a1d]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    minLength={2}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Kasun Perera"
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Role *
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value as AdminUserCreateDTO["role"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  >
                    <option value="customer">Customer</option>
                    <option value="merchant">Merchant</option>
                    <option value="courier">Courier</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Email Address *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="user@nexdrop.lk"
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                    Password *
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                  Phone Number
                </label>
                <input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+94 77 123 4567"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-[#f9fbf9] focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>

              {form.role === "courier" && (
                <div className="p-3 rounded-xl bg-[#f2f7f3] border border-[#e5eee8] space-y-3">
                  <p className="text-xs font-bold text-[#0b3d2a]">Courier Fleet Profile</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                        Vehicle Type
                      </label>
                      <select
                        value={form.vehicle_type || "motorcycle"}
                        onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-white"
                      >
                        <option value="motorcycle">Motorcycle</option>
                        <option value="van">Van</option>
                        <option value="bicycle">Bicycle</option>
                        <option value="truck">Light Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                        License Plate
                      </label>
                      <input
                        value={form.license_plate || ""}
                        onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                        placeholder="WP BDM-1234"
                        className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.role === "merchant" && (
                <div className="p-3 rounded-xl bg-[#f2f7f3] border border-[#e5eee8] space-y-3">
                  <p className="text-xs font-bold text-[#0b3d2a]">Merchant Business Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                        Business Name
                      </label>
                      <input
                        value={form.business_name || ""}
                        onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                        placeholder="e.g. Colombo Mart"
                        className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                        BRN (Optional)
                      </label>
                      <input
                        value={form.registration_number || ""}
                        onChange={(e) =>
                          setForm({ ...form, registration_number: e.target.value })
                        }
                        placeholder="PV-2026-XXXX"
                        className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f2a1d] mb-1">
                      Business Address
                    </label>
                    <input
                      value={form.business_address || ""}
                      onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                      placeholder="123 Galle Road, Colombo 03"
                      className="w-full px-3 py-2 rounded-lg border border-[#e5eee8] bg-white"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-medium text-[#0f2a1d] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-[#e5eee8] text-[#16a34a]"
                />
                Account Active Immediately
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e5eee8]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={creating}
                  className="bg-[#0b3d2a] hover:bg-[#124d35]"
                >
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
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
              {["All", "Customer", "Merchant", "Courier", "Dispatcher", "Admin", "Unassigned"].map((role) => (
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
                        <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}
                          aria-label={`Edit ${u.name}`} className="mr-2 text-xs gap-1.5">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
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
