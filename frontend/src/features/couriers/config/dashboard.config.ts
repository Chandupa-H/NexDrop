/**
 * Courier dashboard configuration.
 * Defines navigation, role metadata, and UI copy for the courier role.
 */

import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export const courierDashboardConfig: DashboardRoleConfig = {
  role: "courier",
  roleLabel: "Courier",
  basePath: "/courier",
  homeHref: "/courier/dashboard",
  topbarTitle: "Courier Dashboard",
  profileHref: "/courier/profile",
  searchPlaceholder: "Search parcels, customers...",
  nav: [
    {
      id: "overview",
      label: "Overview",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/courier/dashboard",
          icon: "layout-dashboard",
          availability: "live",
          match: "exact",
        },
      ],
    },
    {
      id: "delivery-operations",
      label: "Deliveries",
      items: [
        {
          id: "deliveries",
          label: "Assigned Deliveries",
          href: "/courier/deliveries",
          icon: "package",
          availability: "live",
          match: "exact",
        },
        {
          id: "proof",
          label: "Proof of Delivery",
          href: "/courier/proof",
          icon: "camera",
          availability: "live",
          match: "exact",
        },
        {
          id: "failed",
          label: "Failed Deliveries",
          href: "/courier/failed",
          icon: "alert-triangle",
          availability: "live",
          match: "exact",
        },
      ],
    },
    {
      id: "activity",
      label: "Activity",
      items: [
        {
          id: "history",
          label: "Delivery History",
          href: "/courier/history",
          icon: "history",
          availability: "live",
          match: "prefix",
        },
      ],
    },
    {
      id: "administration",
      label: "Administration",
      items: [
        {
          id: "profile",
          label: "My Profile",
          href: "/courier/profile",
          icon: "user",
          availability: "live",
          match: "prefix",
        },
      ],
    },
  ],
};
