import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "./navbar";

const mockUseAuthUser = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-auth-user", () => ({
  useAuthUser: mockUseAuthUser,
}));

describe("Navbar", () => {
  beforeEach(() => {
    mockUseAuthUser.mockReset();
  });

  it("shows Sign In and Sign Up buttons when signed out", () => {
    mockUseAuthUser.mockReturnValue({
      user: null,
      dashboardHref: "/courier/dashboard",
      isLoading: false,
      signOut: vi.fn(),
    });

    render(<Navbar backendHealthy={true} />);

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/login?view=sign_up"
    );
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it("shows Dashboard and Sign Out instead of Sign In/Up when authenticated", () => {
    const signOut = vi.fn();
    mockUseAuthUser.mockReturnValue({
      user: {
        id: "user-1",
        email: "alex@nexdrop.io",
        user_metadata: { full_name: "Alex Vance" },
      },
      dashboardHref: "/admin/dashboard",
      isLoading: false,
      signOut,
    });

    render(<Navbar backendHealthy={true} />);

    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.getByText("Alex Vance")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/admin/dashboard"
    );

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});

