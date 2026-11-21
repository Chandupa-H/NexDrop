import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SavedAddressesCard } from "./SavedAddressesCard";

// Mock customer API
vi.mock("../api/customer.api", () => ({
  getCustomerAddresses: vi.fn().mockResolvedValue([]),
  createCustomerAddress: vi.fn().mockResolvedValue(null),
  updateCustomerAddress: vi.fn().mockResolvedValue(null),
  deleteCustomerAddress: vi.fn().mockResolvedValue(true),
  setDefaultCustomerAddress: vi.fn().mockResolvedValue(null),
}));

describe("SavedAddressesCard contact information display", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("fetches and displays the contact number entered in customer information", () => {
    render(
      <SavedAddressesCard
        initialAddress="Castle Street"
        city="Colombo"
        postalCode="11201"
        userName="Dihini Kankanamage"
        userPhone="+94 77 123 4567"
      />
    );

    // Contact line should show both name and phone cleanly with bullet separator
    expect(
      screen.getByText("Contact: Dihini Kankanamage • +94 77 123 4567")
    ).toBeInTheDocument();
  });

  it("does not render a dangling bullet when contact number is not available", () => {
    render(
      <SavedAddressesCard
        initialAddress="Castle Street"
        city="Colombo"
        postalCode="11201"
        userName="Dihini Kankanamage"
        userPhone=""
      />
    );

    // Should render 'Contact: Dihini Kankanamage' without trailing bullet
    expect(
      screen.getByText("Contact: Dihini Kankanamage")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Contact: Dihini Kankanamage •/)).not.toBeInTheDocument();
  });

  it("pre-fills the customer contact number in the Add New Address modal", () => {
    render(
      <SavedAddressesCard
        initialAddress="Castle Street"
        city="Colombo"
        postalCode="11201"
        userName="Dihini Kankanamage"
        userPhone="0710111454"
      />
    );

    const addButton = screen.getByRole("button", { name: /Add Address/i });
    fireEvent.click(addButton);

    const phoneInput = screen.getByPlaceholderText("e.g. +94 7X XXX XXXX") as HTMLInputElement;
    expect(phoneInput.value).toBe("0710111454");
  });

  it("automatically includes customer profile address as pickup location even when only drop-off addresses are stored", () => {
    // Simulate user previously having only a drop-off destination stored
    localStorage.setItem(
      "nexdrop_customer_saved_addresses_dihini_kankanamage",
      JSON.stringify([
        {
          id: "drop-1",
          addressType: "dropoff",
          label: "Client",
          address: "88 Galle Road",
          city: "Colombo 03",
          postalCode: "00300",
          contactName: "Kasun Perera",
          phone: "0771234567",
          isDefault: false,
        },
      ])
    );

    render(
      <SavedAddressesCard
        initialAddress="Castle Street"
        city="Colombo"
        postalCode="11201"
        userName="Dihini Kankanamage"
        userPhone="0710111454"
      />
    );

    // Both Pickup and Drop-off should be present (All Addresses: 2, Pickup: 1, Drop-off: 1)
    expect(screen.getByText(/All Addresses \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Pickup Locations \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop-off Destinations \(1\)/i)).toBeInTheDocument();
  });

  it("deduplicates identical addresses from localStorage so duplicate cards and counts are not recorded or displayed", () => {
    // Simulate user previously having 3 duplicate entries of Castle Street, Colombo in localStorage
    localStorage.setItem(
      "nexdrop_customer_saved_addresses_dihini_kankanamage",
      JSON.stringify([
        {
          id: "addr-1",
          addressType: "pickup",
          label: "Home",
          address: "Castle Street",
          city: "Colombo",
          postalCode: "00100",
          contactName: "Dihini Kankanamage",
          phone: "0710111454",
          isDefault: true,
        },
        {
          id: "addr-2",
          addressType: "pickup",
          label: "Home",
          address: "Castle Street",
          city: "Colombo",
          postalCode: "00100",
          contactName: "Dihini Kankanamage",
          phone: "0710111454",
          isDefault: false,
        },
        {
          id: "addr-3",
          addressType: "pickup",
          label: "Home",
          address: "Castle Street",
          city: "Colombo",
          postalCode: "00100",
          contactName: "Dihini Kankanamage",
          phone: "0710111454",
          isDefault: false,
        },
      ])
    );

    render(
      <SavedAddressesCard
        initialAddress="Castle Street"
        city="Colombo"
        postalCode="00100"
        userName="Dihini Kankanamage"
        userPhone="0710111454"
      />
    );

    // Tab counter should reflect 1 address, not 3
    expect(screen.getByText(/All Addresses \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Pickup Locations \(1\)/i)).toBeInTheDocument();

    // The address text should appear only once in the address list
    const addressTexts = screen.getAllByText("Castle Street, Colombo (00100)");
    expect(addressTexts).toHaveLength(1);
  });
});
