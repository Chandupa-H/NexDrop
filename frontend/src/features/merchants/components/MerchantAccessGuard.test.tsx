import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { MerchantAccessGuard } from "./MerchantAccessGuard";

const { getUser, getMerchantStatusMe, replace } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getMerchantStatusMe: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getUser } },
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    default: { getMerchantStatusMe },
  };
});

describe("MerchantAccessGuard", () => {
  beforeEach(() => {
    localStorage.clear();
    getUser.mockReset().mockResolvedValue({
      data: {
        user: {
          id: "supabase-user-id",
          email: "merchant@example.test",
          app_metadata: { role: "merchant" },
          user_metadata: { role: "merchant" },
        },
      },
    });
    getMerchantStatusMe.mockReset();
    replace.mockReset();
  });

  it("does not grant access from Supabase role metadata or cached approval alone", async () => {
    localStorage.setItem(
      "nexdrop_merchant_application",
      JSON.stringify({ merchant_id: 17, approval_status: "approved" })
    );
    getMerchantStatusMe.mockRejectedValue(
      new ApiError(404, "No merchant application found.")
    );

    render(
      <MerchantAccessGuard>
        <div>Protected merchant dashboard</div>
      </MerchantAccessGuard>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No backend merchant application is linked to this account."
    );
    expect(screen.queryByText("Protected merchant dashboard")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders protected content only after the backend confirms approval", async () => {
    getMerchantStatusMe.mockResolvedValue({
      merchant_id: 17,
      business_name: "Test Merchant",
      approval_status: "approved",
    });

    render(
      <MerchantAccessGuard>
        <div>Protected merchant dashboard</div>
      </MerchantAccessGuard>
    );

    expect(await screen.findByText("Protected merchant dashboard")).toBeVisible();
  });
});
