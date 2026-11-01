import { render, screen } from "@testing-library/react";
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
});
