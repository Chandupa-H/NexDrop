import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { CustomerProfileAccount } from "./CustomerProfileAccount";
import { CustomerTopbarUser } from "./CustomerTopbarUser";
import { CustomerProfileView } from "./CustomerProfileView";
import { getCustomerAccountProfile, updateCustomerProfile, deleteCustomerProfile, getCustomerProfile } from "../api/customer.api";
import { mapCustomerProfile } from "../api/customer.mappers";
import { validateProfile } from "../lib/profile-validation";
import type { CustomerMeDTO } from "../api/customer.dto";

vi.mock("../api/customer.api", () => ({
  getCustomerAccountProfile: vi.fn(), getCustomerProfile: vi.fn(),
  updateCustomerProfile: vi.fn(), deleteCustomerProfile: vi.fn(),
}));
const stored: CustomerMeDTO = {
  id: 42, full_name: "Test customer", email: "test@example.invalid", role: "customer",
  phone: "0771234567", default_address: "Test street", city: "Test city", postal_code: "00100",
};

describe("customer account availability and profile editing", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows unavailable state without fake identity/edit controls and retries the strict read", async () => {
    vi.mocked(getCustomerAccountProfile).mockRejectedValueOnce(new ApiError(503, "Unavailable")).mockResolvedValueOnce(stored);
    render(<CustomerProfileAccount />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading customer account");
    expect(await screen.findByRole("alert")).toHaveTextContent("verification is unavailable");
    expect(screen.queryByRole("button", { name: "Edit Profile" })).not.toBeInTheDocument();
    expect(screen.queryByText(stored.full_name)).not.toBeInTheDocument();
    expect(getCustomerProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry account lookup" }));
    expect(await screen.findByRole("button", { name: "Edit Profile" })).toBeInTheDocument();
  });

  it("shows retry for other read failures", async () => {
    vi.mocked(getCustomerAccountProfile).mockRejectedValue(new Error("Network failure"));
    render(<CustomerProfileAccount />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
    expect(screen.getByRole("button", { name: "Retry account lookup" })).toBeEnabled();
  });

  it("topbar uses a neutral link instead of a fallback user identity", async () => {
    vi.mocked(getCustomerAccountProfile).mockRejectedValue(new ApiError(503, "Unavailable"));
    render(await CustomerTopbarUser({ profileHref: "/customer/profile" }));
    expect(screen.getByRole("link", { name: "Customer account" })).toHaveAttribute("href", "/customer/profile");
    expect(getCustomerProfile).not.toHaveBeenCalled();
    expect(screen.queryByText("Dihini Kankanamage")).not.toBeInTheDocument();
  });

  it("keeps failed save input, shows no success, and allows retry", async () => {
    vi.mocked(updateCustomerProfile).mockRejectedValueOnce(new ApiError(500, "Failed"))
      .mockResolvedValueOnce({ ...stored, full_name: "New Name" });
    render(<CustomerProfileView initialProfile={mapCustomerProfile(stored)} />);
    expect(screen.getByRole("button", { name: "Delete Profile" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Delete Profile" }));
    expect(deleteCustomerProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    const name = screen.getByLabelText(/Full Name/);
    fireEvent.change(name, { target: { value: " New Name " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
    expect(name).toHaveValue(" New Name ");
    expect(screen.queryByText("Profile updated successfully!")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Profile updated successfully!");
    expect(updateCustomerProfile).toHaveBeenLastCalledWith({
      full_name: "New Name", phone: stored.phone, default_address: stored.default_address,
      city: stored.city, postal_code: stored.postal_code,
    });
  });

  it("disables further edits if verification becomes unavailable during save", async () => {
    vi.mocked(updateCustomerProfile).mockRejectedValue(new ApiError(503, "Unavailable"));
    render(<CustomerProfileView initialProfile={mapCustomerProfile(stored)} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByText(/Account editing is unavailable/);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("New Name");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("associates inputs with labels, validates fields, and displays backend field errors", async () => {
    vi.mocked(updateCustomerProfile).mockRejectedValue(new ApiError(422, "Invalid", {
      detail: [{ loc: ["body", "phone"], msg: "Contact number is invalid" }],
    }));
    render(<CustomerProfileView initialProfile={mapCustomerProfile(stored)} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(screen.getByLabelText("Email Address")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("City"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByText(/City must contain/)).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toHaveAttribute("aria-invalid", "true");
    expect(updateCustomerProfile).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("City"), { target: { value: stored.city } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Contact number is invalid")).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Number/)).toHaveAttribute("aria-invalid", "true");
  });

  it("prevents duplicate save requests", async () => {
    let resolve!: (data: CustomerMeDTO) => void;
    vi.mocked(updateCustomerProfile).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<CustomerProfileView initialProfile={mapCustomerProfile(stored)} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    const save = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(save); fireEvent.click(save);
    expect(updateCustomerProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    await act(async () => resolve(stored));
  });

  it("validates trimmed limits consistently with the backend", () => {
    const values = { full_name: "Test customer", phone: stored.phone, default_address: stored.default_address, city: stored.city, postal_code: stored.postal_code };
    expect(validateProfile(values)).toEqual({});
    for (const field of Object.keys(values)) {
      expect(validateProfile({ ...values, [field]: " " })).toHaveProperty(field);
      expect(validateProfile({ ...values, [field]: "a".repeat(256) })).toHaveProperty(field);
    }
  });
});
