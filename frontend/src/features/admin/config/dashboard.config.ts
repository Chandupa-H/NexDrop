/**
 * Admin dashboard configuration.
 * Defines navigation, role metadata, and UI configuration for platform administrators.
 */

import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export const adminDashboardConfig: DashboardRoleConfig = {
  role: "admin",
  roleLabel: "Administrator",
  basePath: "/admin",
  homeHref: "/admin/dashboard",
  profileHref: "/admin/profile",
  searchPlaceholder: "Search users, merchants, zones, orders...",
  nav: [
    {
      id: "overview",
      label: "Overview",
      items: [
        {
          id: "dashboard",
          label: "Dashboard Overview",
          href: "/admin/dashboard",
          icon: "layout-dashboard",
          availability: "live",
          match: "exact",
        },
      ],
    },
    {
      id: "users-fleet",
      label: "Users & Fleet",
      items: [
        {
          id: "users",
          label: "User Management",
          href: "/admin/users",
          icon: "users",
          availability: "live",
        },
        {
          id: "merchants",
          label: "Merchant Management",
          href: "/admin/merchants",
          icon: "store",
          availability: "live",
          badge: "3 Pending",
        },
        {
          id: "couriers",
          label: "Courier Management",
          href: "/admin/couriers",
          icon: "truck",
          availability: "live",
        },
        {
          id: "dispatchers",
          label: "Dispatcher Management",
          href: "/admin/dispatchers",
          icon: "radio",
          availability: "live",
        },
      ],
    },
    {
      id: "logistics",
      label: "Logistics & Pricing",
      items: [
        {
          id: "zones",
          label: "Delivery Zones",
          href: "/admin/zones",
          icon: "map-pin",
          availability: "live",
        },
        {
          id: "pricing",
          label: "Pricing Management",
          href: "/admin/pricing",
          icon: "dollar-sign",
          availability: "live",
        },
      ],
    },
    {
      id: "administration",
      label: "Administration",
      items: [
        {
          id: "analytics",
          label: "Reports & Analytics",
          href: "/admin/analytics",
          icon: "bar-chart-3",
          availability: "live",
        },
        {
          id: "profile",
          label: "My Profile",
          href: "/admin/profile",
          icon: "user",
          availability: "live",
        },
        {
          id: "settings",
          label: "System Settings",
          href: "/admin/settings",
          icon: "settings",
          availability: "live",
        },
      ],
    },
  ],
};
