import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { TopbarProfileLink } from "./dashboard-topbar";

vi.mock("next/link", () => ({
  default: ({
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

describe("TopbarProfileLink", () => {
  it("links the user chip to the configured profile route without a menu", () => {
    render(
      <TopbarProfileLink
        user={{ id: "courier-1", name: "Ashan Perera", roleLabel: "Courier" }}
        profileHref={
          courierDashboardConfig.profileHref ??
          `${courierDashboardConfig.basePath}/profile`
        }
      />
    );

    const profileLink = screen.getByRole("link", { name: "Open profile" });
    expect(profileLink).toHaveAttribute(
      "href",
      courierDashboardConfig.profileHref
    );
    expect(profileLink).toHaveTextContent("Ashan Perera");
    expect(profileLink).toHaveTextContent("Courier");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens popover menu for customer with Customer Profile link and right-aligned role", () => {
    render(
      <TopbarProfileLink
        user={{ id: "cus-1", name: "Luna", roleLabel: "Customer" }}
        profileHref="/customer/profile"
      />
    );

    const trigger = screen.getByRole("link", { name: "Open profile" });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();

    const customerProfileLink = screen.getByRole("menuitem", { name: /customer profile/i });
    expect(customerProfileLink).toHaveAttribute("href", "/customer/profile");

    const allShipmentsLink = screen.getByRole("menuitem", { name: /all shipments/i });
    expect(allShipmentsLink).toHaveAttribute("href", "/customer/history");

    expect(screen.getByRole("menuitem", { name: /return to home page/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /log out/i })).toBeInTheDocument();
  });
});
