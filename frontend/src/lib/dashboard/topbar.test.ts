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

  it("uses Profile for the profile route", () => {
    expect(getTopbarTitle(courierDashboardConfig, "/courier/profile")).toBe("Profile");
  });

  it("falls back to the role-based title for an unknown path", () => {
    expect(getTopbarTitle(courierDashboardConfig, "/courier/unknown")).toBe(
      "Courier Dashboard"
    );
  });
});
