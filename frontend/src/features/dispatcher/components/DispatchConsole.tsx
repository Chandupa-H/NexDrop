"use client";

import { useState, useEffect } from "react";
import {
  SectionCard,
  StatusBadge,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Truck,
  RotateCcw,
  Warehouse as WarehouseIcon,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  getAssignments,
  getCourierWorkload,
  assignCourier,
  reassignCourier,
  receiveAtWarehouse,
  handoverFromWarehouse,
} from "../api/dispatcher.api";
import type {
  DispatchAssignmentDTO,
  CourierWorkloadDTO,
} from "../api/dispatcher.dto";

export function DispatchConsole() {
  const [tab, setTab] = useState<"assignments" | "workload" | "warehouse">("assignments");

  // State data
  const [assignments, setAssignments] = useState<DispatchAssignmentDTO[]>([]);
  const [workloads, setWorkloads] = useState<CourierWorkloadDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [assignOpen, setAssignOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [warehouseReceiveOpen, setWarehouseReceiveOpen] = useState(false);
  const [warehouseHandoverOpen, setWarehouseHandoverOpen] = useState(false);

  // Form states
  const [assignForm, setAssignForm] = useState({ parcel_id: "", courier_id: "", notes: "" });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [reassignForm, setReassignForm] = useState({ new_courier_id: "", reason: "" });
  const [warehouseReceiveForm, setWarehouseReceiveForm] = useState({ parcel_id: "", warehouse_id: "1", notes: "" });
  const [warehouseHandoverForm, setWarehouseHandoverForm] = useState({ parcel_id: "", warehouse_id: "1", courier_id: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assigns, fleet] = await Promise.all([
        getAssignments().catch(() => []),
        getCourierWorkload().catch(() => []),
      ]);
      setAssignments(assigns);
      setWorkloads(fleet);
    } catch {
      // Fallback empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await assignCourier({
        parcel_id: Number(assignForm.parcel_id),
        courier_id: Number(assignForm.courier_id),
        notes: assignForm.notes || undefined,
      });
      setMessage({ text: `Parcel #${assignForm.parcel_id} assigned successfully! Event 'CourierAssigned' published.`, type: "success" });
      setAssignOpen(false);
      setAssignForm({ parcel_id: "", courier_id: "", notes: "" });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to assign courier. Check courier availability.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await reassignCourier(selectedAssignmentId, {
        new_courier_id: Number(reassignForm.new_courier_id),
        reason: reassignForm.reason || undefined,
      });
      setMessage({ text: `Dispatch #${selectedAssignmentId} reassigned! Event 'CourierReassigned' published.`, type: "success" });
      setReassignOpen(false);
      setReassignForm({ new_courier_id: "", reason: "" });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to reassign courier.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarehouseReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await receiveAtWarehouse({
        parcel_id: Number(warehouseReceiveForm.parcel_id),
        warehouse_id: Number(warehouseReceiveForm.warehouse_id),
        notes: warehouseReceiveForm.notes || undefined,
      });
      setMessage({ text: `Parcel #${warehouseReceiveForm.parcel_id} scanned into warehouse! Event 'WarehouseParcelReceived' published.`, type: "success" });
      setWarehouseReceiveOpen(false);
      setWarehouseReceiveForm({ parcel_id: "", warehouse_id: "1", notes: "" });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to receive parcel into warehouse.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarehouseHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await handoverFromWarehouse({
        parcel_id: Number(warehouseHandoverForm.parcel_id),
        warehouse_id: Number(warehouseHandoverForm.warehouse_id),
        courier_id: Number(warehouseHandoverForm.courier_id),
        notes: warehouseHandoverForm.notes || undefined,
      });
      setMessage({ text: `Handed over Parcel #${warehouseHandoverForm.parcel_id} to courier! Event 'CourierAssigned' published.`, type: "success" });
      setWarehouseHandoverOpen(false);
      setWarehouseHandoverForm({ parcel_id: "", warehouse_id: "1", courier_id: "", notes: "" });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to handover parcel.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Console Sub-header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 p-1 bg-[var(--dashboard-surface)] border border-[var(--dashboard-border)] rounded-xl">
          <button
            onClick={() => setTab("assignments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === "assignments"
                ? "bg-[#16a34a] text-white shadow-sm"
                : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
              }`}
          >
            <Truck className="w-4 h-4" /> Assignments
          </button>
          <button
            onClick={() => setTab("workload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === "workload"
                ? "bg-[#16a34a] text-white shadow-sm"
                : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
              }`}
          >
            <Users className="w-4 h-4" /> Courier Workload ({workloads.length})
          </button>
          <button
            onClick={() => setTab("warehouse")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === "warehouse"
                ? "bg-[#16a34a] text-white shadow-sm"
                : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
              }`}
          >
            <WarehouseIcon className="w-4 h-4" /> Warehouse Routing
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-1.5 text-xs bg-[#16a34a] hover:bg-[#15803d] text-white">
            <Plus className="w-3.5 h-3.5" /> Assign Courier
          </Button>
        </div>
      </div>

      {/* Tab 1: Assignments Table */}
      {tab === "assignments" && (
        <SectionCard title="Active & Recent Dispatch Assignments" subtitle="Track real-time assignments and trigger immediate reassignments">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--dashboard-border)] text-[var(--dashboard-muted)] font-semibold">
                  <th className="py-3 px-3">Dispatch #</th>
                  <th className="py-3 px-3">Parcel ID</th>
                  <th className="py-3 px-3">Assigned Courier</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Time</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dashboard-border)] text-[var(--dashboard-text)]">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--dashboard-muted)]">
                      No dispatch assignments found. Click &quot;Assign Courier&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-[var(--dashboard-surface)] transition-colors">
                      <td className="py-3 px-3 font-mono font-medium">#{a.id}</td>
                      <td className="py-3 px-3 font-semibold text-[#16a34a]">Parcel #{a.parcel_id}</td>
                      <td className="py-3 px-3">Courier #{a.courier_id}</td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          label={a.status.toUpperCase()}
                          tone={
                            a.status === "completed"
                              ? "success"
                              : a.status === "rejected"
                                ? "danger"
                                : "info"
                          }
                        />
                      </td>
                      <td className="py-3 px-3 text-[var(--dashboard-muted)]">
                        {new Date(a.assigned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-3 text-[var(--dashboard-muted)] max-w-xs truncate">{a.notes || "—"}</td>
                      <td className="py-3 px-3 text-right">
                        {a.status !== "completed" && a.status !== "rejected" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedAssignmentId(a.id);
                              setReassignOpen(true);
                            }}
                          >
                            <RotateCcw className="w-3 h-3" /> Reassign
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Tab 2: Courier Fleet Workload */}
      {tab === "workload" && (
        <SectionCard title="Courier Fleet Workload & Capacity Management" subtitle="Live view of active assignments, capacity load, and courier availability">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workloads.length === 0 ? (
              <div className="col-span-full py-8 text-center text-[var(--dashboard-muted)] text-sm">
                No courier workloads retrieved. Ensure couriers are registered in the database.
              </div>
            ) : (
              workloads.map((c) => (
                <div
                  key={c.courier_id}
                  className="p-4 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--dashboard-text)]">{c.full_name}</h4>
                      <p className="text-xs text-[var(--dashboard-muted)]">
                        Courier #{c.courier_id} • Vehicle: <span className="capitalize">{c.vehicle_type}</span>
                      </p>
                    </div>
                    <StatusBadge
                      label={c.workload_status}
                      tone={
                        c.workload_status === "AVAILABLE"
                          ? "success"
                          : c.workload_status === "OPTIMAL"
                            ? "info"
                            : c.workload_status === "BUSY"
                              ? "warning"
                              : "danger"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--dashboard-border)]">
                    <span className="text-[var(--dashboard-muted)]">Active Dispatches</span>
                    <span className="font-bold text-sm text-[var(--dashboard-text)]">{c.active_assignments}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--dashboard-muted)]">Fleet Status</span>
                    <span className={`font-semibold ${c.is_available ? "text-emerald-600" : "text-rose-600"}`}>
                      {c.is_available ? "● Ready for Dispatch" : "○ Offline / Off-duty"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      )}

      {/* Tab 3: Warehouse Dispatch */}
      {tab === "warehouse" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Warehouse Inbound Receipt" subtitle="Scan parcels entering a sorting hub and publish WarehouseParcelReceived event">
            <p className="text-xs text-[var(--dashboard-muted)] mb-4">
              Receiving a parcel at a warehouse sets its routing method to VIA_WAREHOUSE and updates its current location type to WAREHOUSE.
            </p>
            <Button
              onClick={() => setWarehouseReceiveOpen(true)}
              className="w-full gap-2 text-xs bg-[#16a34a] hover:bg-[#15803d] text-white"
            >
              <WarehouseIcon className="w-4 h-4" /> Scan Parcel Into Hub
            </Button>
          </SectionCard>

          <SectionCard title="Warehouse Last-Mile Handover" subtitle="Dispatch stored parcels from warehouse to a delivery courier">
            <p className="text-xs text-[var(--dashboard-muted)] mb-4">
              Hands over the parcel from the warehouse facility to an active courier, setting parcel status to OUT_FOR_DELIVERY.
            </p>
            <Button
              variant="outline"
              onClick={() => setWarehouseHandoverOpen(true)}
              className="w-full gap-2 text-xs border-[#16a34a] text-[#16a34a] hover:bg-emerald-50"
            >
              <Truck className="w-4 h-4" /> Handover to Courier
            </Button>
          </SectionCard>
        </div>
      )}

      {/* Modal 1: Assign Courier */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Courier to Parcel">
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Parcel ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 1"
              value={assignForm.parcel_id}
              onChange={(e) => setAssignForm({ ...assignForm, parcel_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Courier ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 1"
              value={assignForm.courier_id}
              onChange={(e) => setAssignForm({ ...assignForm, courier_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Notes (optional)</label>
            <Input
              placeholder="Pickup instructions or priority..."
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-[#16a34a] hover:bg-[#15803d] text-white">
              {submitting ? "Assigning..." : "Assign & Publish"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Reassign Courier */}
      <Modal isOpen={reassignOpen} onClose={() => setReassignOpen(false)} title={`Reassign Dispatch #${selectedAssignmentId}`}>
        <form onSubmit={handleReassign} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">New Courier ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 2"
              value={reassignForm.new_courier_id}
              onChange={(e) => setReassignForm({ ...reassignForm, new_courier_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Reassignment Reason</label>
            <Input
              placeholder="e.g. Vehicle breakdown, shift ended..."
              value={reassignForm.reason}
              onChange={(e) => setReassignForm({ ...reassignForm, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white">
              {submitting ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Warehouse Receive */}
      <Modal isOpen={warehouseReceiveOpen} onClose={() => setWarehouseReceiveOpen(false)} title="Receive Parcel into Warehouse">
        <form onSubmit={handleWarehouseReceive} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Parcel ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 1"
              value={warehouseReceiveForm.parcel_id}
              onChange={(e) => setWarehouseReceiveForm({ ...warehouseReceiveForm, parcel_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Warehouse ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 1"
              value={warehouseReceiveForm.warehouse_id}
              onChange={(e) => setWarehouseReceiveForm({ ...warehouseReceiveForm, warehouse_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Notes</label>
            <Input
              placeholder="Bay / Bin location..."
              value={warehouseReceiveForm.notes}
              onChange={(e) => setWarehouseReceiveForm({ ...warehouseReceiveForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setWarehouseReceiveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-[#16a34a] hover:bg-[#15803d] text-white">
              {submitting ? "Processing..." : "Record Inbound"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Warehouse Handover */}
      <Modal isOpen={warehouseHandoverOpen} onClose={() => setWarehouseHandoverOpen(false)} title="Warehouse Handover to Courier">
        <form onSubmit={handleWarehouseHandover} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Parcel ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 1"
              value={warehouseHandoverForm.parcel_id}
              onChange={(e) => setWarehouseHandoverForm({ ...warehouseHandoverForm, parcel_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Warehouse ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 1"
              value={warehouseHandoverForm.warehouse_id}
              onChange={(e) => setWarehouseHandoverForm({ ...warehouseHandoverForm, warehouse_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--dashboard-text)]">Delivery Courier ID</label>
            <Input
              type="number"
              required
              placeholder="e.g. 2"
              value={warehouseHandoverForm.courier_id}
              onChange={(e) => setWarehouseHandoverForm({ ...warehouseHandoverForm, courier_id: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setWarehouseHandoverOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-[#16a34a] hover:bg-[#15803d] text-white">
              {submitting ? "Handing over..." : "Handover & Dispatch"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
