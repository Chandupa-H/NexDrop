import { describe, it, expect } from "vitest";
import { customerDashboardConfig } from "./dashboard.config";
import { getDashboardConfig } from "@/lib/dashboard/registry";

describe("Customer Dashboard Config", () => {
  it("has valid role configuration values", () => {
    expect(customerDashboardConfig.role).toBe("customer");
    expect(customerDashboardConfig.roleLabel).toBe("Customer");
    expect(customerDashboardConfig.basePath).toBe("/customer");
    expect(customerDashboardConfig.homeHref).toBe("/customer/dashboard");
    expect(customerDashboardConfig.profileHref).toBe("/customer/profile");
  });

  it("has Dashboard item with exact match", () => {
    const flatItems = customerDashboardConfig.nav.flatMap((sec) => sec.items);
    const dashboardItem = flatItems.find((item) => item.id === "dashboard");

    expect(dashboardItem).toBeDefined();
    expect(dashboardItem?.match).toBe("exact");
    expect(dashboardItem?.availability).toBe("live");
    expect(dashboardItem?.href).toBe("/customer/dashboard");
  });

  it("has at most 5 primary nav items for mobile tab bar", () => {
    const primaryItems = customerDashboardConfig.nav[0].items;
    expect(primaryItems.length).toBeLessThanOrEqual(5);
  });

  it("has customer profile navigation configured", () => {
    const flatItems = customerDashboardConfig.nav.flatMap((sec) => sec.items);
    const profileItem = flatItems.find((item) => item.id === "profile");
    expect(profileItem).toBeDefined();
    expect(profileItem?.href).toBe("/customer/profile");
    expect(profileItem?.availability).toBe("live");
  });

  it("is registered in the dashboard registry", () => {
    const registered = getDashboardConfig("customer");
    expect(registered).toBeDefined();
    expect(registered.role).toBe("customer");
    expect(registered.roleLabel).toBe("Customer");
  });
});
