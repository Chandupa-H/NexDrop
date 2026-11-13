"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  RotateCcw, 
  X,
  SlidersHorizontal 
} from "lucide-react";

export interface PricingChangeItem {
  label: string;
  oldValue: string;
  newValue: string;
}

interface PricingConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  changes: PricingChangeItem[];
}

export function PricingConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  changes,
}: PricingConfirmModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const hasChanges = changes.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isSaving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${hasChanges ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
              {hasChanges ? (
                <SlidersHorizontal className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 id="confirm-modal-title" className="text-base font-bold text-slate-900">
                {hasChanges ? "Confirm Pricing Changes" : "No Changes Detected"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {hasChanges 
                  ? "Do you want to save these changes to the live platform?"
                  : "All rates match the currently saved platform configuration."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {hasChanges ? (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Summary of Modified Rates ({changes.length})
              </p>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/40 overflow-hidden">
                {changes.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="line-through text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {item.oldValue}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                        {item.newValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Saving will immediately update active delivery calculations and merchant checkout estimates across Sri Lanka.
                </p>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-slate-500 text-sm">
              You haven&apos;t modified any tariffs, rates, or multipliers yet.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs font-medium"
          >
            {hasChanges ? "Cancel" : "Close"}
          </Button>

          {hasChanges && (
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirm}
              disabled={isSaving}
              className="gap-1.5 text-xs font-semibold bg-[#0b3d2a] hover:bg-[#124d35] text-white"
            >
              {isSaving ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Yes, Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

