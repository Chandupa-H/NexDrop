import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./logout-button";

const logoutAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/logout", () => ({ logoutAction }));

describe("LogoutButton", () => {
  beforeEach(() => {
    logoutAction.mockReset();
    logoutAction.mockResolvedValue(undefined);
  });

  it("submits logout through the server-action form", async () => {
    render(<LogoutButton />);

    const button = screen.getByRole("button", { name: "Log out" });
    expect(button).toHaveClass("dashboard-logout-button");
    expect(button).not.toHaveAttribute("role", "menuitem");
    const form = button.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(logoutAction).toHaveBeenCalledOnce());
  });
});
