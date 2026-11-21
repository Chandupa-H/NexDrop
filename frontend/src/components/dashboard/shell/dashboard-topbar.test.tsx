import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { DashboardTopbar, TopbarProfileLink } from "./dashboard-topbar";

const logoutAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/logout", () => ({ logoutAction }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/courier/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("DashboardTopbar", () => {
  beforeEach(() => {
    logoutAction.mockReset();
    logoutAction.mockResolvedValue(undefined);
  });

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

  it("submits topbar logout through the server-action form", async () => {
    localStorage.setItem("nexdrop_merchant_application", "test");
    render(
      <TopbarProfileLink
        user={{ id: "test-user", name: "Test Merchant", roleLabel: "Merchant" }}
        profileHref="/merchant/dashboard?tab=profile"
      />
    );

    fireEvent.click(screen.getByRole("link", { name: "Open profile" }));
    const button = screen.getByRole("menuitem", { name: "Log out" });
    const form = button.closest("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    await waitFor(() => expect(logoutAction).toHaveBeenCalledOnce());
    expect(localStorage.getItem("nexdrop_merchant_application")).toBeNull();
  });
});
