"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SidebarContent } from "./sidebar-content";
import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export function MobileNav({
  config,
  open,
  onClose,
}: {
  config: DashboardRoleConfig;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && open && !dialog.contains(document.activeElement)) {
      dialog.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dialogRef.current?.close();
      onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      id="dashboard-mobile-drawer"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label="Dashboard navigation"
      className="dashboard-mobile-drawer"
    >
      <button
        type="button"
        onClick={onClose}
        className="dashboard-drawer-close"
        aria-label="Close navigation"
      >
        <X aria-hidden="true" />
      </button>
      <SidebarContent config={config} onNavigate={onClose} />
    </dialog>
  );
}
