import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerProfileView } from "./CustomerProfileView";
import type { CustomerProfile } from "../types";

vi.mock("../api/customer.api", () => ({
  getCustomerProfile: vi.fn().mockResolvedValue(null),
  updateCustomerProfile: vi.fn(),
  deleteCustomerProfile: vi.fn(),
}));

vi.mock("@/lib/auth/logout", () => ({
  logoutAction: vi.fn(),
}));

describe("CustomerProfileView Default Delivery Address", () => {
  const profileWithoutAddress: CustomerProfile = {
    id: "1",
    fullName: "Haseetha Manuravi",
    email: "customer@nexdrop.lk",
    phone: "+94773686920",
    role: "customer",
    defaultAddress: "",
    city: "",
    postalCode: "",
  };

  const profileWithAddress: CustomerProfile = {
    id: "1",
    fullName: "Luna",
    email: "luneskie23@gmail.com",
    phone: "0712345678",
    role: "customer",
    defaultAddress: "123, ABC Street",
    city: "Colombo",
    postalCode: "10345",
  };

  it("renders '+ Add Address' button when there is no address included and opens edit modal on click", () => {
    render(<CustomerProfileView initialProfile={profileWithoutAddress} />);

    // Broken comma should not be rendered
    expect(screen.queryByText("123, ABC Street")).toBeNull();

    // The Add Address button with + sign must be present
    const addAddressBtn = screen.getByRole("button", { name: /add address/i });
    expect(addAddressBtn).toBeDefined();

    // Click the button
    fireEvent.click(addAddressBtn);

    // Edit Profile popup should appear
    expect(screen.getByRole("heading", { name: /edit profile/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/street address, apartment/i)).toBeDefined();
  });

  it("renders '+ Add Address' button if address is just a comma or whitespace", () => {
    const profileWithComma: CustomerProfile = {
      ...profileWithoutAddress,
      defaultAddress: ",",
    };
    render(<CustomerProfileView initialProfile={profileWithComma} />);

    const addAddressBtn = screen.getByRole("button", { name: /add address/i });
    expect(addAddressBtn).toBeDefined();
  });

  it("renders address details instead of 'Add Address' button when address is configured", () => {
    render(<CustomerProfileView initialProfile={profileWithAddress} />);

    expect(screen.getByText("123, ABC Street")).toBeDefined();
    expect(screen.getByText("Colombo, 10345")).toBeDefined();
    expect(screen.queryByRole("button", { name: /add address/i })).toBeNull();
  });
});
