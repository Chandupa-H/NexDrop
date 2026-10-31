import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./logout-button";

const logoutAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/logout", () => ({ logoutAction }));

describe("LogoutButton", () => {
  beforeEach(() => {
    logoutAction.mockReset();
  });

  it("keeps the sidebar logout button and calls the server action", () => {
    render(<LogoutButton />);

    const button = screen.getByRole("button", { name: "Log out" });
    expect(button).toHaveClass("dashboard-logout-button");
    expect(button).not.toHaveAttribute("role", "menuitem");
    fireEvent.click(button);

    expect(logoutAction).toHaveBeenCalledOnce();
  });
});
