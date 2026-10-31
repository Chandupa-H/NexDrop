import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { SidebarContent } from "./sidebar-content";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courier/dashboard",
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
  it("renders the navigation and logout without a sidebar promo", () => {
    render(<SidebarContent config={courierDashboardConfig} />);

    expect(screen.getByText("NexDrop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByText(/deliver smarter together/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Learn more")).not.toBeInTheDocument();
  });
});
