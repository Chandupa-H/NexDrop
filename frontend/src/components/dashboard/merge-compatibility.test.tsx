import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { getDashboardConfig } from "@/lib/dashboard/registry";
import { DashboardTopbar, TopbarProfileLink } from "./shell/dashboard-topbar";
import { DonutChart } from "./widgets/donut-chart";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/customer/dashboard", useRouter: () => ({ push }), notFound: () => { throw new Error("Not found"); } }));
vi.mock("@/lib/auth/logout", () => ({ logoutAction: vi.fn() }));

it.each(["customer", "merchant", "courier", "admin", "dispatcher"] as const)("retains the %s dashboard registration", (role) => {
  expect(getDashboardConfig(role).role).toBe(role);
});

it("keeps safely encoded customer tracking search", () => {
  render(<DashboardTopbar config={getDashboardConfig("customer")} userSlot={null} unreadNotifications={0} mobileMenuOpen={false} onMenuOpen={vi.fn()} />);
  const search = screen.getByRole("searchbox");
  fireEvent.change(search, { target: { value: " ND /?#123 " } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(push).toHaveBeenCalledWith(`/customer/track?id=${encodeURIComponent("ND /?#123")}`);
});

it.each(["customer", "courier", "admin", "dispatcher"])("keeps direct profile navigation for %s", (role) => {
  render(<TopbarProfileLink user={{ id: "test", name: "Test account", roleLabel: role }} profileHref={`/${role}/profile`} />);
  expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute("href", `/${role}/profile`);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("retains merchant-specific links with explicit menu configuration", () => {
  render(<TopbarProfileLink user={{ id: "test", name: "Test account", roleLabel: "Merchant" }} profileHref="/merchant/dashboard?tab=api" variant="merchant-menu" />);
  fireEvent.click(screen.getByRole("link", { name: "Open profile" }));
  expect(screen.getByRole("menuitem", { name: "All Shipments" })).toHaveAttribute("href", "/merchant/dashboard?tab=orders");
  expect(screen.getByRole("menuitem", { name: "API Keys & Integrations" })).toHaveAttribute("href", "/merchant/dashboard?tab=api");
  expect(screen.getByRole("menuitem", { name: "Log out" })).toBeEnabled();
});

it("supports compact charts and customer className together", () => {
  const { container } = render(<DonutChart segments={[]} centerLabel="Orders" compact className="customer-chart" />);
  expect(container.firstElementChild).toHaveClass("customer-chart");
  expect(screen.getByRole("img")).toHaveClass("h-32", "w-32");
});

it("preserves the customer chart's normal layout", () => {
  const { container } = render(<DonutChart segments={[]} centerLabel="Orders" className="customer-chart" />);
  expect(container.firstElementChild).toHaveClass("min-h-[260px]", "customer-chart");
  expect(screen.getByRole("img")).toHaveClass("h-48", "w-48");
});
