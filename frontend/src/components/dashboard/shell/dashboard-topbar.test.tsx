import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { DashboardTopbar } from "./dashboard-topbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courier/dashboard",
}));

describe("DashboardTopbar", () => {
  it("renders search without a keyboard-shortcut hint", () => {
    const { container } = render(
      <DashboardTopbar
        config={courierDashboardConfig}
        userSlot={<div>Profile</div>}
        unreadNotifications={0}
        mobileMenuOpen={false}
        onMenuOpen={vi.fn()}
      />
    );

    expect(screen.getByRole("searchbox", { name: "Search dashboard" })).toBeVisible();
    expect(container.querySelector("kbd")).not.toBeInTheDocument();
  });

  it("keeps the Courier Dashboard title consistent on Courier routes", () => {
    const { container } = render(
      <DashboardTopbar
        config={courierDashboardConfig}
        userSlot={<div>Profile</div>}
        unreadNotifications={0}
        mobileMenuOpen={false}
        onMenuOpen={vi.fn()}
      />
    );

    expect(container.querySelector("header")).toHaveAttribute("data-role", "courier");
    expect(screen.getByText("Courier Dashboard")).toBeInTheDocument();
    expect(container.querySelector(".dashboard-page-title")).not.toHaveAttribute("aria-live");
  });
});
