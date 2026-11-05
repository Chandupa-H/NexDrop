import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { SidebarContent } from "./sidebar-content";

const { route } = vi.hoisted(() => ({ route: { pathname: "/courier/dashboard" } }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

describe("SidebarContent", () => {
  beforeEach(() => {
    route.pathname = "/courier/dashboard";
  });

  it("renders the navigation and logout without a sidebar promo", () => {
    render(<SidebarContent config={courierDashboardConfig} />);

    expect(screen.getByText("NexDrop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByText(/deliver smarter together/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Learn more")).not.toBeInTheDocument();
  });

  it("activates Delivery History on its list and detail routes", () => {
    route.pathname = "/courier/history/2001";
    render(<SidebarContent config={courierDashboardConfig} />);

    expect(
      screen.getByRole("link", { name: "Delivery History" })
    ).toHaveAttribute("aria-current", "page");
  });
});
