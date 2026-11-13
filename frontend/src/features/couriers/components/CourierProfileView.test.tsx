import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeCourierPassword,
  getCourierAccountProfile,
  updateCourierAccountProfile,
} from "../api/courier.api";
import { ApiError } from "@/lib/api-client";
import { CourierProfileView } from "./CourierProfileView";

vi.mock("../api/courier.api", () => ({
  changeCourierPassword: vi.fn(),
  getCourierAccountProfile: vi.fn(),
  updateCourierAccountProfile: vi.fn(),
}));

const profile = {
  id: 1,
  full_name: "Kasun Perera",
  email: "kasun@example.com",
  contact_phone: "+94 77 123 4567",
  status: "ACTIVE" as const,
  joined_date: "2026-01-15",
};

describe("CourierProfileView", () => {
  beforeEach(() => {
    vi.mocked(changeCourierPassword).mockRejectedValue(
      new ApiError(
        501,
        "Courier password changes are unavailable until the authentication service is implemented."
      )
    );
    vi.mocked(getCourierAccountProfile).mockResolvedValue(profile);
    vi.mocked(updateCourierAccountProfile).mockResolvedValue({
      ...profile,
      full_name: "Kasun Fernando",
      contact_phone: "+94 71 555 1234",
    });
  });

  it("loads profile details and keeps email and courier ID read-only", async () => {
    render(<CourierProfileView />);

    expect(
      await screen.findByRole("heading", { name: "Kasun Perera" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toHaveAttribute("readOnly");
    expect(screen.getAllByText("COU-1")).toHaveLength(2);
    expect(screen.getAllByText("January 15, 2026")).toHaveLength(2);
    expect(screen.queryByText(/vehicle/i)).not.toBeInTheDocument();
  });

  it("edits name and phone and updates the profile header after save", async () => {
    render(<CourierProfileView />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Full Legal Name"), {
      target: { value: "Kasun Fernando" },
    });
    fireEvent.change(screen.getByLabelText("Contact Phone Number"), {
      target: { value: "+94 71 555 1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("heading", { name: "Kasun Fernando" })).toBeInTheDocument();
    expect(updateCourierAccountProfile).toHaveBeenCalledWith({
      full_name: "Kasun Fernando",
      contact_phone: "+94 71 555 1234",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your profile was updated."
    );
  });

  it("shows loading and API failure states", async () => {
    let rejectProfile: (error: Error) => void = () => {};
    vi.mocked(getCourierAccountProfile).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectProfile = reject;
        })
    );
    render(<CourierProfileView />);

    expect(screen.getByLabelText("Loading profile")).toBeInTheDocument();
    rejectProfile(new ApiError(503, "Service unavailable"));

    expect(
      await screen.findByRole("heading", { name: "Couldn't load your profile" })
    ).toBeInTheDocument();
    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("validates phone number before making a save request", async () => {
    render(<CourierProfileView />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Contact Phone Number"), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enter a valid contact phone number."
      )
    );
    expect(updateCourierAccountProfile).not.toHaveBeenCalled();
  });

  it("shows all password fields with independent visibility controls", async () => {
    render(<CourierProfileView />);
    await screen.findByRole("heading", { name: "Kasun Perera" });

    expect(screen.getByLabelText("Current Password")).toHaveAttribute(
      "type",
      "password"
    );
    fireEvent.click(screen.getByRole("button", { name: "Show current password" }));
    expect(screen.getByLabelText("Current Password")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByLabelText("New Password")).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText("Confirm New Password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("validates password length and confirmation before requesting the API", async () => {
    render(<CourierProfileView />);
    await screen.findByRole("heading", { name: "Kasun Perera" });

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
    expect(changeCourierPassword).not.toHaveBeenCalled();

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
    expect(changeCourierPassword).not.toHaveBeenCalled();
  });

  it("calls the courier API and shows its explicit unsupported response", async () => {
    render(<CourierProfileView />);
    await screen.findByRole("heading", { name: "Kasun Perera" });

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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Courier password changes are unavailable until the authentication service is implemented."
    );
    expect(changeCourierPassword).toHaveBeenCalledWith({
      current_password: "current-password",
      new_password: "a-secure-password",
      confirm_password: "a-secure-password",
    });
  });
});
