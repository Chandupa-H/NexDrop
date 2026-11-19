/**
 * Customer dashboard configuration.
 * Defines navigation, role metadata, and UI copy for the customer role.
 */

import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export const customerDashboardConfig: DashboardRoleConfig = {
  role: "customer",
  roleLabel: "Customer",
  basePath: "/customer",
  homeHref: "/customer/dashboard",
  profileHref: "/customer/profile",
  searchPlaceholder: "Search parcels, tracking number...",
  nav: [
    {
      id: "activity",
      label: "Activity",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/customer/dashboard",
          icon: "layout-dashboard",
          availability: "live",
          match: "exact",
        },
        {
          id: "book",
          label: "Book Delivery",
          href: "/customer/book",
          icon: "package",
          availability: "live",
        },
        {
          id: "track",
          label: "Track Parcel",
          href: "/customer/track",
          icon: "navigation",
          availability: "live",
        },
        {
          id: "addresses",
          label: "Saved Addresses",
          href: "/customer/addresses",
          icon: "map-pin",
          availability: "live",
        },
        {
          id: "history",
          label: "Delivery History",
          href: "/customer/history",
          icon: "history",
          availability: "live",
        },
      ],
    },
    {
      id: "account",
      label: "Account",
      items: [
        {
          id: "profile",
          label: "Customer Profile",
          href: "/customer/profile",
          icon: "user",
          availability: "live",
        },
      ],
    },
  ],
};
