import { describe, expect, it } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { getTopbarTitle } from "./topbar";

describe("getTopbarTitle", () => {
  it("uses the role-based title on the home page", () => {
    expect(getTopbarTitle(courierDashboardConfig, "/courier/dashboard")).toBe(
      "Courier Dashboard"
    );
  });

  it("uses the active navigation label on another page", () => {
    const config = {
      ...courierDashboardConfig,
      topbarTitle: undefined,
      nav: [
        {
          id: "operations",
          items: [
            {
              id: "history",
              label: "Delivery History",
              href: "/courier/history",
              icon: "history" as const,
              availability: "live" as const,
            },
          ],
        },
      ],
    };

    expect(getTopbarTitle(config, "/courier/history/123")).toBe("Delivery History");
  });

  it("keeps the Courier Dashboard title for every Courier feature route", () => {
    for (const pathname of [
      "/courier/dashboard",
      "/courier/deliveries",
      "/courier/history",
      "/courier/profile",
    ]) {
      expect(getTopbarTitle(courierDashboardConfig, pathname)).toBe(
        "Courier Dashboard"
      );
    }
  });

  it("falls back to the role-based title for an unknown path", () => {
    expect(getTopbarTitle(courierDashboardConfig, "/courier/unknown")).toBe(
      "Courier Dashboard"
    );
  });
});
