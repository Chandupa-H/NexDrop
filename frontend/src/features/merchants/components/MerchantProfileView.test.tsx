import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import {
  changeMerchantPassword,
  getMerchantAccountProfile,
  updateMerchantAccountProfile,
} from "../api/merchant.api";
import { MerchantProfileView } from "./MerchantProfileView";

vi.mock("../api/merchant.api", () => ({
  changeMerchantPassword: vi.fn(),
  getMerchantAccountProfile: vi.fn(),
  updateMerchantAccountProfile: vi.fn(),
}));

const profile = {
  id: 8,
  full_name: "Kasun Perera",
  email: "kasun@example.com",
  contact_phone: "+94 77 123 4567",
  business_name: "Ceylon Crafts",
  registration_number: "PV12984-2024",
  business_contact_phone: "+94 71 123 4567",
  business_address: "45 Galle Road, Colombo",
  business_type: "retail",
  website_url: "https://ceylon.example.com",
  approval_status: "approved" as const,
  rejection_reason: null,
  joined_date: "2026-01-15",
};

describe("MerchantProfileView", () => {
  beforeEach(() => {
    vi.mocked(changeMerchantPassword).mockResolvedValue(undefined);
    vi.mocked(getMerchantAccountProfile).mockResolvedValue(profile);
    vi.mocked(updateMerchantAccountProfile).mockResolvedValue({
      ...profile,
      business_name: "Ceylon Craftworks",
    });
  });

  it("loads real profile values and keeps email and registration number read-only", async () => {
    render(<MerchantProfileView />);

    expect(
      await screen.findByRole("heading", { name: "Ceylon Crafts" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toHaveAttribute("readOnly");
    expect(screen.getByLabelText("Registration Number")).toHaveAttribute("readOnly");
    expect(screen.getByLabelText("Business Name")).toHaveValue("Ceylon Crafts");
    expect(screen.getAllByText("MER-000008")).toHaveLength(2);
    expect(screen.getAllByText("January 15, 2026")).toHaveLength(2);
  });

  it("updates account and business details through the profile API", async () => {
    render(<MerchantProfileView />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Kasun Fernando" },
    });
    fireEvent.change(screen.getByLabelText("Business Name"), {
      target: { value: "Ceylon Craftworks" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile changes" }));

    expect(
      await screen.findByRole("heading", { name: "Ceylon Craftworks" })
    ).toBeInTheDocument();
    expect(updateMerchantAccountProfile).toHaveBeenCalledWith({
      full_name: "Kasun Fernando",
      contact_phone: "+94 77 123 4567",
      business_name: "Ceylon Craftworks",
      business_contact_phone: "+94 71 123 4567",
      business_address: "45 Galle Road, Colombo",
      business_type: "retail",
      website_url: "https://ceylon.example.com",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your profile changes have been saved."
    );
  });

  it("validates phone numbers before making a save request", async () => {
    render(<MerchantProfileView />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Business Phone Number"), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile changes" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enter valid account and business contact phone numbers."
      )
    );
    expect(updateMerchantAccountProfile).not.toHaveBeenCalled();
  });

  it("shows loading and API failure states", async () => {
    let rejectProfile: (error: Error) => void = () => {};
    vi.mocked(getMerchantAccountProfile).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectProfile = reject;
        })
    );
    render(<MerchantProfileView />);

    expect(screen.getByLabelText("Loading profile")).toBeInTheDocument();
    rejectProfile(new ApiError(503, "Service unavailable"));

    expect(
      await screen.findByRole("heading", { name: "Couldn't load your profile" })
    ).toBeInTheDocument();
    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows independently toggleable password fields and updates the password", async () => {
    render(<MerchantProfileView />);
    await screen.findByRole("heading", { name: "Ceylon Crafts" });

    expect(screen.getByLabelText("Current Password")).toHaveAttribute(
      "type",
      "password"
    );
    fireEvent.click(screen.getByRole("button", { name: "Show current password" }));
    expect(screen.getByLabelText("Current Password")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByLabelText("New Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm New Password")).toHaveAttribute(
      "type",
      "password"
    );

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your password was updated."
    );
    expect(changeMerchantPassword).toHaveBeenCalledWith({
      current_password: "current-password",
      new_password: "a-secure-password",
      confirm_password: "a-secure-password",
    });
    expect(screen.getByLabelText("Current Password")).toHaveValue("");
  });

  it("validates password length and confirmation before requesting the API", async () => {
    render(<MerchantProfileView />);
    await screen.findByRole("heading", { name: "Ceylon Crafts" });

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "New password must be at least 12 characters."
    );
    expect(changeMerchantPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "a-different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password confirmation does not match."
    );
    expect(changeMerchantPassword).not.toHaveBeenCalled();
  });
});
