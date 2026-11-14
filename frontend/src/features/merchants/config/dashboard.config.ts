/**
 * Merchant dashboard configuration.
 * Defines navigation, role metadata, and UI copy for the merchant portal.
 */

import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export const merchantDashboardConfig: DashboardRoleConfig = {
  role: "merchant",
  roleLabel: "Merchant Portal",
  basePath: "/merchant",
  homeHref: "/merchant/dashboard?tab=orders",
  profileHref: "/merchant/dashboard?tab=api",
  searchPlaceholder: "Search shipments, tracking #, recipient...",
  nav: [
    {
      id: "operations",
      label: "Shipments & Orders",
      items: [
        {
          id: "orders",
          label: "All Shipments",
          href: "/merchant/dashboard?tab=orders",
          icon: "package",
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
