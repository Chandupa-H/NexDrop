import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const { replace, getUser, signIn, oauth } = vi.hoisted(() => ({
  replace: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), oauth: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ supabase: { auth: {
  getUser, signInWithPassword: signIn, signInWithOAuth: oauth,
} } }));
beforeEach(() => vi.clearAllMocks());

it.each([
  ["admin", "/admin/dashboard"], ["courier", "/courier/dashboard"],
  ["dispatcher", "/dispatcher/dashboard"], ["merchant", "/merchant"],
  ["customer", "/"], ["unassigned", "/register"],
])("uses the %s dashboard when signing in without a return URL", async (role, destination) => {
  const user = { id: "u1", app_metadata: { role } };
  signIn.mockResolvedValue({ data: { user, session: {} }, error: null });
  getUser.mockResolvedValue({ data: { user } });
  render(<AuthForm mode="sign_in" onModeChange={vi.fn()} onRequireVerification={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
});

it("leaves OAuth destination to role resolution when there is no return URL", async () => {
  oauth.mockResolvedValue({ error: null });
  render(<AuthForm mode="sign_in" onModeChange={vi.fn()} onRequireVerification={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
  await waitFor(() => expect(oauth).toHaveBeenCalledWith(expect.objectContaining({
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })));
});
