"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertTriangle,
  FileText,
  Camera,
  RefreshCw,
  Upload,
} from "lucide-react";
import type { ActionType, AssignedParcel, ParcelStatus } from "../types";

// TODO(api): Integrate with PATCH /api/v1/courier/parcels/{id}/status
// TODO(forms): Introduce React Hook Form + Zod when production contracts are ready

interface ParcelDetailsDrawerProps {
  parcel: AssignedParcel | null;
  isOpen: boolean;
  initialAction?: ActionType | null;
  onClose: () => void;
  onUpdateStatus: (parcelId: string, newStatus: ParcelStatus) => void;
}

const STATUS_ORDER: ParcelStatus[] = [
  "PENDING",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const TIMELINE_STEPS = [
  { status: "PICKED_UP", label: "Picked Up", icon: Package },
  { status: "IN_TRANSIT", label: "In Transit", icon: Truck },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: Clock },
  { status: "DELIVERED", label: "Delivered", icon: CheckCircle2 },
];

function getDefaultNextStatus(status?: ParcelStatus): ParcelStatus {
  if (status === "PENDING") return "PICKED_UP";
  if (status === "PICKED_UP") return "IN_TRANSIT";
  if (status === "IN_TRANSIT") return "OUT_FOR_DELIVERY";
  return "DELIVERED";
}

export function ParcelDetailsDrawer({
  parcel,
  isOpen,
  initialAction = null,
  onClose,
  onUpdateStatus,
}: ParcelDetailsDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Active accordion/expanded panel
  const [activePanel, setActivePanel] = useState<ActionType | null>(initialAction);

  // Form states initialized without needing setState in useEffect
  const [selectedNextStatus, setSelectedNextStatus] = useState<ParcelStatus>(() =>
    getDefaultNextStatus(parcel?.status)
  );
  const [noteText, setNoteText] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>(() =>
    parcel?.notes ? [parcel.notes] : []
  );
  const [failedReason, setFailedReason] = useState("Customer unavailable");
  const [failedNote, setFailedNote] = useState("");

  // Sync open state with native <dialog> only (no setStates in effect)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  if (!parcel) return null;

  const currentIdx = STATUS_ORDER.indexOf(parcel.status);

  // Valid next options
  const availableStatuses: { value: ParcelStatus; label: string }[] = [
    { value: "PICKED_UP", label: "Picked Up" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { value: "DELIVERED", label: "Delivered" },
  ];

  const handleStatusConfirm = () => {
    onUpdateStatus(parcel.id, selectedNextStatus);
    setActivePanel(null);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    setSavedNotes((prev) => [...prev, noteText.trim()]);
    setNoteText("");
    setActivePanel(null);
  };

  const handleReportFailed = () => {
    onUpdateStatus(parcel.id, "FAILED");
    if (failedNote.trim()) {
      setSavedNotes((prev) => [...prev, `[Failed: ${failedReason}] ${failedNote.trim()}`]);
    }
    setActivePanel(null);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="courier-parcel-drawer text-[#0F2A1D]"
      aria-labelledby="drawer-title"
    >
      <div className="flex flex-col min-h-full p-6 space-y-6">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-[#E5EEE8] pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-[#16A34A] tracking-wider uppercase">
              Parcel Details
            </span>
            <h2 id="drawer-title" className="text-xl font-bold text-[#0F2A1D] mt-0.5">
              {parcel.trackingId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close parcel details"
            className="p-2 rounded-xl text-[#5B7266] hover:bg-[#F2F7F3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Customer & Address Details */}
        <div className="rounded-2xl bg-[#F2F7F3] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B7266]">Recipient</span>
            <span className="text-xs font-bold text-[#0F2A1D]">{parcel.customerName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B7266]">Phone</span>
            <span className="text-xs font-semibold text-[#0F2A1D] flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
              {parcel.phone}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-medium text-[#5B7266] shrink-0">Destination</span>
            <span className="text-xs font-medium text-[#0F2A1D] text-right flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#DC2626] shrink-0" aria-hidden="true" />
              {parcel.destination}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#E5EEE8] pt-2">
            <span className="text-xs font-medium text-[#5B7266]">Package Weight</span>
            <span className="text-xs font-bold text-[#0F2A1D] tabular-nums">{parcel.weight} kg</span>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#0F2A1D]">Delivery Timeline</h3>
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5EEE8]">
            {TIMELINE_STEPS.map((step) => {
              const stepIdx = STATUS_ORDER.indexOf(step.status as ParcelStatus);
              const isDone = parcel.status === "DELIVERED" || currentIdx >= stepIdx;
              const isCurrent = parcel.status === step.status;
              const Icon = step.icon;

              return (
                <div key={step.status} className="relative flex items-center gap-3">
                  <div
                    className={`absolute -left-6 h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
                      isDone
                        ? "bg-[#16A34A] text-white"
                        : "bg-white border-2 border-[#E5EEE8] text-[#5B7266]"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-[#16A34A]"
                          : isDone
                          ? "text-[#0F2A1D]"
                          : "text-[#5B7266]"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved Notes display */}
        {savedNotes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#0F2A1D]">Recorded Notes</h3>
            <div className="space-y-1.5">
              {savedNotes.map((note, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Grid */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-[#0F2A1D]">Courier Actions</h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "update-status" ? null : "update-status")}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                activePanel === "update-status"
                  ? "bg-[#0B3D2A] text-white border-[#0B3D2A]"
                  : "bg-white border-[#E5EEE8] hover:bg-[#F2F7F3]"
              }`}
            >
              <RefreshCw className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
              Update status
            </button>

            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "add-note" ? null : "add-note")}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                activePanel === "add-note"
                  ? "bg-[#0B3D2A] text-white border-[#0B3D2A]"
                  : "bg-white border-[#E5EEE8] hover:bg-[#F2F7F3]"
              }`}
            >
              <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Add note
            </button>

            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "upload-proof" ? null : "upload-proof")}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                activePanel === "upload-proof"
                  ? "bg-[#0B3D2A] text-white border-[#0B3D2A]"
                  : "bg-white border-[#E5EEE8] hover:bg-[#F2F7F3]"
              }`}
            >
              <Camera className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
              Upload proof
            </button>

            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "report-failed" ? null : "report-failed")}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                activePanel === "report-failed"
                  ? "bg-[#DC2626] text-white border-[#DC2626]"
                  : "bg-white border-[#E5EEE8] hover:bg-[#FDE4E4] text-[#B42318]"
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
              Report failed
            </button>
          </div>

          {/* Inline Action Panels */}

          {/* 1. Update Status Panel */}
          {activePanel === "update-status" && (
            <div className="p-4 rounded-2xl bg-[#F2F7F3] border border-[#E5EEE8] space-y-3">
              <label htmlFor="next-status" className="block text-xs font-bold text-[#0F2A1D]">
                Select New Status
              </label>
              <select
                id="next-status"
                value={selectedNextStatus}
                onChange={(e) => setSelectedNextStatus(e.target.value as ParcelStatus)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#E5EEE8] text-xs font-medium text-[#0F2A1D] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              >
                {availableStatuses.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleStatusConfirm}
                className="w-full h-9 rounded-xl bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D] transition-colors"
              >
                Confirm Status Change
              </button>
            </div>
          )}

          {/* 2. Add Note Panel */}
          {activePanel === "add-note" && (
            <div className="p-4 rounded-2xl bg-[#F2F7F3] border border-[#E5EEE8] space-y-3">
              <label htmlFor="note-input" className="block text-xs font-bold text-[#0F2A1D]">
                Delivery Note
              </label>
              <textarea
                id="note-input"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="E.g. Package left with building security guard..."
                className="w-full p-2.5 rounded-xl bg-white border border-[#E5EEE8] text-xs text-[#0F2A1D] placeholder:text-[#5B7266] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
              <button
                type="button"
                onClick={handleSaveNote}
                className="w-full h-9 rounded-xl bg-[#0B3D2A] text-white text-xs font-semibold hover:bg-[#145233] transition-colors"
              >
                Save Note
              </button>
            </div>
          )}

          {/* 3. Upload Proof Panel */}
          {activePanel === "upload-proof" && (
            <div className="p-4 rounded-2xl bg-[#F2F7F3] border border-[#E5EEE8] space-y-3">
              <p className="text-xs font-bold text-[#0F2A1D]">Proof of Delivery</p>
              <div className="border-2 border-dashed border-[#5B7266]/30 rounded-xl p-6 text-center space-y-2 bg-white/50">
                <Upload className="h-6 w-6 text-[#5B7266] mx-auto opacity-50" aria-hidden="true" />
                <p className="text-xs font-semibold text-[#5B7266]">
                  File upload comes with the API
                </p>
                <p className="text-[10px] text-[#5B7266]/80">
                  (Accepts JPG, PNG up to 5MB upon backend integration)
                </p>
              </div>
            </div>
          )}

          {/* 4. Report Failed Delivery Panel */}
          {activePanel === "report-failed" && (
            <div className="p-4 rounded-2xl bg-[#FDE4E4] border border-[#B42318]/20 space-y-3">
              <label htmlFor="failed-reason" className="block text-xs font-bold text-[#B42318]">
                Failed Delivery Reason
              </label>
              <select
                id="failed-reason"
                value={failedReason}
                onChange={(e) => setFailedReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#E5EEE8] text-xs font-medium text-[#0F2A1D] focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              >
                <option value="Customer unavailable">Customer unavailable</option>
                <option value="Wrong address">Wrong address</option>
                <option value="Refused by customer">Refused by customer</option>
                <option value="Phone unreachable">Phone unreachable</option>
                <option value="Other">Other</option>
              </select>

              <textarea
                rows={2}
                value={failedNote}
                onChange={(e) => setFailedNote(e.target.value)}
                placeholder="Additional notes about failure..."
                className="w-full p-2.5 rounded-xl bg-white border border-[#E5EEE8] text-xs text-[#0F2A1D] placeholder:text-[#5B7266] focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              />

              <button
                type="button"
                onClick={handleReportFailed}
                className="w-full h-9 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-[#B91C1C] transition-colors"
              >
                Log Failed Delivery
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
