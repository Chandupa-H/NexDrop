import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/lib/api-client";
import {
  changeMerchantPassword,
  getMerchantAccountProfile,
  updateMerchantAccountProfile,
} from "./merchant.api";

vi.mock("@/lib/api-client", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe("merchant profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the current merchant profile from the authenticated endpoint", async () => {
    const profile = { id: 8, business_name: "Ceylon Crafts" };
    vi.mocked(apiClient.get).mockResolvedValue(profile);

    await expect(getMerchantAccountProfile()).resolves.toEqual(profile);
    expect(apiClient.get).toHaveBeenCalledWith("/merchants/me/profile");
  });

  it("saves editable account and business fields", async () => {
    const changes = {
      full_name: "Kasun Perera",
      contact_phone: "+94 77 123 4567",
      business_name: "Ceylon Crafts",
      business_contact_phone: "+94 77 123 4567",
      business_address: "Colombo",
      business_type: "retail",
      website_url: null,
    };
    vi.mocked(apiClient.patch).mockResolvedValue({ ...changes, id: 8 });

    await expect(updateMerchantAccountProfile(changes)).resolves.toMatchObject({
      id: 8,
      business_name: "Ceylon Crafts",
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/merchants/me/profile",
      changes
    );
  });

  it("sends password changes to the authenticated merchant endpoint", async () => {
    const password = {
      current_password: "current-password",
      new_password: "a-secure-password",
      confirm_password: "a-secure-password",
    };
    vi.mocked(apiClient.post).mockResolvedValue(undefined);

    await expect(changeMerchantPassword(password)).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledWith(
      "/merchants/me/profile/change-password",
      password
    );
  });
});
