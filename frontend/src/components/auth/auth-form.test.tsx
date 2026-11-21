import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const { replace, getUser, signIn, signUp, oauth, getMerchantStatusMe } = vi.hoisted(() => ({
  replace: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), oauth: vi.fn(),
  getMerchantStatusMe: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ supabase: { auth: {
  getUser, signInWithPassword: signIn, signUp, signInWithOAuth: oauth,
} } }));
vi.mock("@/lib/api-client", () => ({ default: { getMerchantStatusMe } }));
beforeEach(() => vi.clearAllMocks());

it.each([
  ["admin", "/admin/dashboard"], ["courier", "/courier/dashboard"],
  ["dispatcher", "/dispatcher/dashboard"], ["merchant", "/merchant/dashboard"],
  ["customer", "/"], ["unassigned", "/register"],
])("uses the %s dashboard when signing in without a return URL", async (role, destination) => {
  const user = { id: "u1", app_metadata: { role } };
  signIn.mockResolvedValue({ data: { user, session: {} }, error: null });
  getUser.mockResolvedValue({ data: { user } });
  if (role === "merchant") {
    getMerchantStatusMe.mockResolvedValue({
      merchant_id: 7,
      business_name: "Test business",
      approval_status: "approved",
    });
  }
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

it("returns a newly signed-up merchant to the requested registration flow", async () => {
  signUp.mockResolvedValue({ data: { session: {} }, error: null });
  render(
    <AuthForm
      mode="sign_up"
      onModeChange={vi.fn()}
      onRequireVerification={vi.fn()}
      onSuccessRedirect="/merchant/register"
    />
  );
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "merchant@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

  await waitFor(() => {
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "merchant@example.com",
        options: {
          emailRedirectTo: expect.stringContaining(
            "next=%2Fmerchant%2Fregister"
          ),
        },
      })
    );
    expect(replace).toHaveBeenCalledWith("/merchant/register");
  });
});
