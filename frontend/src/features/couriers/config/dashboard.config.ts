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
  profileHref: "/courier/profile",
  searchPlaceholder: "Search parcels, customers...",
  nav: [
    {
      id: "operations",
      label: "Operations",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/courier/dashboard",
          icon: "layout-dashboard",
          availability: "live",
          match: "exact",
        },
        {
          id: "parcels",
          label: "Assigned Parcels",
          href: "/courier/parcels",
          icon: "package",
          availability: "planned",
        },
        {
          id: "status",
          label: "Update Status",
          href: "/courier/status",
          icon: "refresh-cw",
          availability: "planned",
        },
        {
          id: "proof",
          label: "Proof of Delivery",
          href: "/courier/proof",
          icon: "camera",
          availability: "planned",
        },
        {
          id: "failed",
          label: "Failed Deliveries",
          href: "/courier/failed",
          icon: "alert-triangle",
          availability: "planned",
        },
        {
          id: "history",
          label: "Delivery History",
          href: "/courier/history",
          icon: "history",
          availability: "planned",
        },
      ],
    },
  ],
};
