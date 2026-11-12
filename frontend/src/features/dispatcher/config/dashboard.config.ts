import type { DashboardRoleConfig } from "@/lib/dashboard/types";

export const dispatcherDashboardConfig: DashboardRoleConfig = {
  role: "dispatcher",
  roleLabel: "Dispatcher",
  basePath: "/dispatcher",
  homeHref: "/dispatcher/dashboard",
  profileHref: "/dispatcher/profile",
  searchPlaceholder: "Search parcels, couriers, dispatches...",
  nav: [
    {
      id: "operations",
      label: "Operations",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/dispatcher/dashboard",
          icon: "layout-dashboard",
          availability: "live",
          match: "exact",
        },
        {
          id: "assignments",
          label: "Assignments",
          href: "/dispatcher/assignments",
          icon: "truck",
          availability: "planned",
        },
        {
          id: "parcels",
          label: "Unassigned Parcels",
          href: "/dispatcher/parcels",
          icon: "package",
          availability: "live",
        },
        {
          id: "couriers",
          label: "Couriers",
          href: "/dispatcher/couriers",
          icon: "user",
          availability: "planned",
        },
        {
          id: "tracking",
          label: "Live Tracking",
          href: "/dispatcher/tracking",
          icon: "navigation",
          availability: "planned",
        },
      ],
    },
  ],
};

