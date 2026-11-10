import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { DashboardTopbar } from "./dashboard-topbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courier/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
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
});
