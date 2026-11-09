"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import type { ParcelDetail, ParcelStatus, ActionType } from "../types";
import {
  deleteDeliveryProof,
  getParcelDetail,
  submitFailedDelivery,
  submitSuccessfulDelivery,
  updateParcelStatus,
  uploadDeliveryProof,
} from "../api/courier.api";
import { mapParcelDetail } from "../api/courier.mappers";
import { getNextStatuses, getStatusLabel, getStatusTone } from "../lib/status";
import { StatusBadge } from "@/components/dashboard";

interface ParcelDetailsDrawerProps {
  trackingId: string;
  action?: ActionType;
  onClose: () => void;
  onStatusUpdated: (options?: { closeDrawer?: boolean }) => void;
}

/**
 * Native <dialog> drawer for parcel details.
 * Shows tracking info, timeline, and 4 action panels (Update Status, Add Note, Upload Proof, Report Failed).
 */
export function ParcelDetailsDrawer({
  trackingId,
  action,
  onClose,
  onStatusUpdated,
}: ParcelDetailsDrawerProps) {
  const [parcel, setParcel] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action panel state
  const [expandedPanel, setExpandedPanel] = useState<ActionType | null>(
    action || null
  );

  // Update status form
  const [selectedStatus, setSelectedStatus] = useState<ParcelStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Report failed form
  const [failureReason, setFailureReason] = useState<string>("");
  const [failureNote, setFailureNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [proofDeleting, setProofDeleting] = useState(false);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [successConfirmed, setSuccessConfirmed] = useState(false);
  const [failureConfirmed, setFailureConfirmed] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  useEffect(() => {
    const fetchParcel = async () => {
      try {
        setLoading(true);
        const dto = await getParcelDetail(trackingId);
        setParcel(mapParcelDetail(dto));
      } catch {
        setError("Failed to load parcel details");
      } finally {
        setLoading(false);
      }
    };
    fetchParcel();
  }, [trackingId]);

  useEffect(() => {
    const dialog = document.getElementById(
      "parcel-drawer"
    ) as HTMLDialogElement | null;
    if (dialog && !loading) {
      dialog.showModal();
    }
  }, [loading]);

  const handleClose = () => {
    const dialog = document.getElementById(
      "parcel-drawer"
    ) as HTMLDialogElement | null;
    if (dialog) dialog.close();
    onClose();
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !parcel) return;
    try {
      setStatusSubmitting(true);
      const dto = await updateParcelStatus(trackingId, {
        status: selectedStatus,
        note: statusNote || undefined,
      });
      setParcel(mapParcelDetail(dto));
      setSelectedStatus("");
      setStatusNote("");
      onStatusUpdated();
    } catch {
      alert("Failed to update status");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleReportFailed = async () => {
    if (!parcel) return;
    if (!failureReason) {
      setResultError("Select a failure reason before submitting.");
      return;
    }
    if (!failureConfirmed) {
      setResultError("Confirm that you want to record this failed delivery.");
      return;
    }
    try {
      setResultSubmitting(true);
      setResultError(null);
      const dto = await submitFailedDelivery(trackingId, {
        failure_reason: failureReason,
        note: failureNote.trim(),
        confirmed: true,
      });
      setParcel(mapParcelDetail(dto));
      setFailureReason("");
      setFailureNote("");
      setFailureConfirmed(false);
      setExpandedPanel(null);
      setResultMessage("Failed delivery recorded successfully.");
      onStatusUpdated({ closeDrawer: false });
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Unable to record the failed delivery.");
    } finally {
      setResultSubmitting(false);
    }
  };

  const handleProofSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setResultError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setResultError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResultError("Proof photo must be 5 MB or smaller.");
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleRemoveProof = async () => {
    setResultError(null);
    if (proofFile) {
      setProofFile(null);
      setProofPreview(null);
      return;
    }
    if (!parcel?.deliveryProof) return;
    try {
      setProofDeleting(true);
      const dto = await deleteDeliveryProof(trackingId);
      setParcel(mapParcelDetail(dto));
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "Unable to delete the proof photo.");
    } finally {
      setProofDeleting(false);
    }
  };

  const handleSuccessfulDelivery = async () => {
    if (!parcel) return;
    if (!recipientName.trim()) {
      setResultError("Enter the recipient's name before submitting.");
      return;
    }
    if (!proofFile && !parcel.deliveryProof) {
      setResultError("Upload a delivery proof photo before submitting.");
      return;
    }
    if (!successConfirmed) {
      setResultError("Confirm that the parcel was delivered to the recipient.");
      return;
    }

    try {
      setResultSubmitting(true);
      setResultError(null);
      if (proofFile) {
        setUploadProgress(0);
        const uploaded = await uploadDeliveryProof(trackingId, proofFile, setUploadProgress);
        setParcel(mapParcelDetail(uploaded.parcel));
        setProofFile(null);
        setProofPreview(null);
        setUploadProgress(null);
      }
      const dto = await submitSuccessfulDelivery(trackingId, {
        recipient_name: recipientName.trim(),
        confirmed: true,
      });
      setParcel(mapParcelDetail(dto));
      setSuccessConfirmed(false);
      setResultMessage("Delivery confirmed successfully.");
      onStatusUpdated({ closeDrawer: false });
    } catch (err) {
      setUploadProgress(null);
      setResultError(err instanceof Error ? err.message : "Unable to complete the delivery result.");
    } finally {
      setResultSubmitting(false);
    }
  };

  if (loading) {
    return (
      <dialog
        id="parcel-drawer"
        className="fixed inset-0 z-50 h-screen w-full max-w-2xl rounded-none bg-white p-6 shadow-xl backdrop:bg-black/50"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-neutral-600">Loading...</div>
        </div>
      </dialog>
    );
  }

  if (error || !parcel) {
    return (
      <dialog
        id="parcel-drawer"
        className="fixed inset-0 z-50 h-screen w-full max-w-2xl rounded-none bg-white p-6 shadow-xl backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Error</h2>
            <button
              onClick={handleClose}
              className="text-neutral-500 hover:text-neutral-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-6 text-center text-neutral-600">
            {error || "Parcel not found"}
          </div>
        </div>
      </dialog>
    );
  }

  const nextStatuses = getNextStatuses(parcel.status);

  return (
    <dialog
      id="parcel-drawer"
      className="fixed inset-0 z-50 h-dvh max-h-dvh w-full max-w-2xl overflow-y-auto overscroll-contain rounded-none bg-white p-6 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {parcel.trackingId}
            </h2>
            <div className="mt-1">
              <StatusBadge
                label={getStatusLabel(parcel.status)}
                tone={getStatusTone(parcel.status)}
              />
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-neutral-500 hover:text-neutral-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Customer Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-neutral-900">Customer</h3>
          <div className="text-sm text-neutral-700">
            <div>{parcel.customerName}</div>
            <div className="text-neutral-500">{parcel.customerPhoneMasked}</div>
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <h3 className="font-medium text-neutral-900">Destination</h3>
          <div className="text-sm text-neutral-700">
            <div>{parcel.destination}</div>
            <div className="text-neutral-500">{parcel.addressLine}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <h3 className="font-medium text-neutral-900">Timeline</h3>
          <div className="space-y-3">
            {parcel.timeline.map((event, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <div className="shrink-0 w-20 text-neutral-500">
                  {event.occurredAtDisplay}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-neutral-900">
                    {event.label}
                  </div>
                  {event.location && (
                    <div className="text-neutral-500">{event.location}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panels */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium text-neutral-900">Actions</h3>
          {resultMessage && (
            <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">
              {resultMessage}
            </p>
          )}
          {resultError && (
            <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
              {resultError}
            </p>
          )}

          {/* Panel 1: Update Status */}
          {nextStatuses.length > 0 && (
            <details
              open={expandedPanel === "update-status"}
              onToggle={(e) =>
                setExpandedPanel(
                  e.currentTarget.open ? "update-status" : null
                )
              }
              className="group rounded border"
            >
              <summary className="cursor-pointer px-4 py-3 font-medium text-neutral-900 hover:bg-neutral-50">
                Update Status
              </summary>
              <div className="space-y-3 border-t p-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Next Status
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as ParcelStatus)
                    }
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Select status...</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {getStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Note (optional)
                  </span>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={2}
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Add a note..."
                  />
                </label>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!selectedStatus || statusSubmitting}
                  className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {statusSubmitting ? "Updating..." : "Confirm Update"}
                </button>
              </div>
            </details>
          )}

          {/* Panel 2: Add Note (UI only, TODO) */}
          <details
            open={expandedPanel === "add-note"}
            onToggle={(e) =>
              setExpandedPanel(e.currentTarget.open ? "add-note" : null)
            }
            className="group rounded border"
          >
            <summary className="cursor-pointer px-4 py-3 font-medium text-neutral-900 hover:bg-neutral-50">
              Add Note
            </summary>
            <div className="space-y-3 border-t p-4">
              <textarea
                rows={3}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Enter note..."
                disabled
              />
              <button
                disabled
                className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white opacity-50"
              >
                Save Note (TODO)
              </button>
            </div>
          </details>

          {parcel.status === "out_for_delivery" && <details
            open={expandedPanel === "upload-proof"}
            onToggle={(e) =>
              setExpandedPanel(e.currentTarget.open ? "upload-proof" : null)
            }
            className="group rounded border"
          >
            <summary className="cursor-pointer px-4 py-3 font-medium text-neutral-900 hover:bg-neutral-50">
              Upload Proof of Delivery
            </summary>
            <div className="space-y-3 border-t p-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">Recipient Name <span aria-hidden="true">*</span></span>
                <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} maxLength={255} required className="w-full rounded border px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">Delivery Proof Photo <span aria-hidden="true">*</span></span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProofSelection} disabled={resultSubmitting || proofDeleting} className="w-full rounded border px-3 py-2 text-sm" />
              </label>
              {(proofPreview || parcel.deliveryProof?.secureUrl) && (
                <div className="space-y-2">
                  <Image src={proofPreview || parcel.deliveryProof?.secureUrl || ""} alt="Delivery proof preview" width={448} height={224} unoptimized className="max-h-56 rounded border object-contain" />
                  <button type="button" onClick={handleRemoveProof} disabled={resultSubmitting || proofDeleting} className="rounded border px-3 py-2 text-sm disabled:opacity-50">
                    {proofDeleting ? "Removing…" : proofFile ? "Remove selected photo" : "Remove uploaded proof"}
                  </button>
                </div>
              )}
              {uploadProgress !== null && (
                <div aria-live="polite" className="space-y-1 text-sm text-neutral-700">
                  <div>Uploading proof… {uploadProgress}%</div>
                  <progress value={uploadProgress} max={100} className="w-full" />
                </div>
              )}
              {parcel.proofCleanupPending && <p className="text-sm text-amber-700">The new proof is saved. Cleanup of the previous Cloudinary image will be retried when you confirm delivery.</p>}
              <label className="flex items-start gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={successConfirmed} onChange={(event) => setSuccessConfirmed(event.target.checked)} />
                <span>I confirm this parcel was delivered to the named recipient.</span>
              </label>
              <button type="button" onClick={handleSuccessfulDelivery} disabled={resultSubmitting || proofDeleting} className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {uploadProgress !== null ? `Uploading ${uploadProgress}%…` : resultSubmitting ? "Submitting…" : "Confirm Successful Delivery"}
              </button>
            </div>
          </details>}

          {/* Panel 4: Report Failed */}
          {["picked_up", "in_transit", "out_for_delivery"].includes(parcel.status) && <details
            open={expandedPanel === "report-failed"}
            onToggle={(e) =>
              setExpandedPanel(e.currentTarget.open ? "report-failed" : null)
            }
            className="group rounded border border-danger-200"
          >
            <summary className="cursor-pointer px-4 py-3 font-medium text-danger-700 hover:bg-danger-50">
              Report Failed Delivery
            </summary>
            <div className="space-y-3 border-t p-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Failure Reason
                </span>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="">Select reason...</option>
                  <option value="address_not_found">Address Not Found</option>
                  <option value="customer_unavailable">
                    Customer Unavailable
                  </option>
                  <option value="refused_delivery">Refused Delivery</option>
                  <option value="damaged_parcel">Damaged Parcel</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Note
                </span>
                <textarea
                  value={failureNote}
                  onChange={(e) => setFailureNote(e.target.value)}
                  rows={2}
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Describe the issue..."
                />
              </label>
              <label className="flex items-start gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={failureConfirmed} onChange={(event) => setFailureConfirmed(event.target.checked)} />
                <span>I confirm this delivery attempt failed for the selected reason.</span>
              </label>
              <button
                type="button"
                onClick={handleReportFailed}
                disabled={!failureReason || !failureConfirmed || resultSubmitting}
                className="w-full rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {resultSubmitting ? "Submitting..." : "Reject Delivery"}
              </button>
            </div>
          </details>}
        </div>
      </div>
    </dialog>
  );
}
