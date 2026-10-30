/**
 * Courier sidebar navigation configuration.
 * Only Dashboard is a live route today. All other items are aria-disabled stubs.
 * Add real hrefs here as features are built — the sidebar reads this array.
 */
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  Camera,
  AlertTriangle,
  History,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** true = real link; false = aria-disabled stub (no navigation) */
  enabled: boolean;
}

export const COURIER_NAV: NavItem[] = [
  { label: "Dashboard",        href: "/courier/dashboard",     icon: LayoutDashboard, enabled: true  },
  { label: "Assigned Parcels", href: "/courier/parcels",       icon: Package,         enabled: false },
  { label: "Update Status",    href: "/courier/update-status", icon: RefreshCw,       enabled: false },
  { label: "Proof of Delivery",href: "/courier/proof",         icon: Camera,          enabled: false },
  { label: "Failed Deliveries",href: "/courier/failed",        icon: AlertTriangle,   enabled: false },
  { label: "Delivery History", href: "/courier/history",       icon: History,         enabled: false },
  { label: "Settings",         href: "/courier/settings",      icon: Settings,        enabled: false },
];
