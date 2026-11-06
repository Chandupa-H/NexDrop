/**
 * Merchant dashboard configuration.
 * Defines navigation, role metadata, and UI copy for the merchant portal.
 */

import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export const merchantDashboardConfig: DashboardRoleConfig = {
  role: "merchant",
  roleLabel: "Merchant Portal",
  basePath: "/merchant",
  homeHref: "/merchant/dashboard",
  profileHref: "/merchant/dashboard?tab=api",
  searchPlaceholder: "Search shipments, tracking #, recipient...",
  nav: [
    {
      id: "operations",
      label: "Shipments & Orders",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/merchant/dashboard",
          icon: "layout-dashboard",
          availability: "live",
          match: "exact",
        },
        {
          id: "orders",
          label: "All Shipments",
          href: "/merchant/dashboard?tab=orders",
          icon: "package",
          badge: "6",
          availability: "live",
        },
        {
          id: "create",
          label: "New Shipment",
          href: "/merchant/dashboard?tab=create",
          icon: "plus-circle",
          availability: "live",
        },
      ],
    },
    {
      id: "integration",
      label: "Developer & Integration",
      items: [
        {
          id: "api",
          label: "API Keys & Docs",
          href: "/merchant/dashboard?tab=api",
          icon: "key",
          availability: "live",
        },
        {
          id: "webhooks",
          label: "Webhooks",
          href: "/merchant/dashboard?tab=webhooks",
          icon: "webhook",
          availability: "live",
        },
      ],
    },
  ],
};

