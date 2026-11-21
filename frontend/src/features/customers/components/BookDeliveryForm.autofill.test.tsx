import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookDeliveryForm } from "./BookDeliveryForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("BookDeliveryForm dynamic multi-account autofill", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("autofills Luna's details and saved default address when Luna is logged in", () => {
    render(
      <BookDeliveryForm
        customerName="Luna"
        customerPhone="0712345678"
        defaultAddress="123, ABC Street"
        defaultCity="Colombo"
        userEmail="luneskie23@gmail.com"
      />
    );

    const nameInput = screen.getByPlaceholderText(/sender name/i) as HTMLInputElement;
    const phoneInput = screen.getAllByPlaceholderText(/\+94 7X XXX XXXX/i)[0] as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(/street address, apartment/i) as HTMLInputElement;
    const cityInput = screen.getByPlaceholderText(/colombo, kandy/i) as HTMLInputElement;

    expect(nameInput.value).toBe("Luna");
    expect(phoneInput.value).toBe("0712345678");
    expect(addressInput.value).toBe("123, ABC Street");
    expect(cityInput.value).toBe("Colombo");
  });

  it("autofills Haseetha's profile details and leaves address clean without leaking Luna's data from localStorage", () => {
    // Simulate Luna previously saving her address into legacy/shared localStorage
    localStorage.setItem(
      "nexdrop_customer_saved_addresses",
      JSON.stringify([
        {
          id: "1",
          addressType: "pickup",
          label: "Home",
          address: "123, ABC Street",
          city: "Colombo",
          postalCode: "10345",
          isDefault: true,
          contactName: "Luna",
          phone: "0712345678",
        },
      ])
    );
    localStorage.setItem(
      "nexdrop_customer_default_pickup",
      JSON.stringify({
        id: "1",
        addressType: "pickup",
        label: "Home",
        address: "123, ABC Street",
        city: "Colombo",
        postalCode: "10345",
        isDefault: true,
        contactName: "Luna",
        phone: "0712345678",
      })
    );

    // Now render form as Haseetha Manuravi
    render(
      <BookDeliveryForm
        customerName="Haseetha Manuravi"
        customerPhone="+94773686920"
        defaultAddress=""
        defaultCity=""
        userEmail="customer@nexdrop.lk"
      />
    );

    const nameInput = screen.getByPlaceholderText(/sender name/i) as HTMLInputElement;
    const phoneInput = screen.getAllByPlaceholderText(/\+94 7X XXX XXXX/i)[0] as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(/street address, apartment/i) as HTMLInputElement;
    const cityInput = screen.getByPlaceholderText(/colombo, kandy/i) as HTMLInputElement;

    expect(nameInput.value).toBe("Haseetha Manuravi");
    expect(phoneInput.value).toBe("+94773686920");
    expect(addressInput.value).toBe("");
    expect(cityInput.value).toBe("");
  });

  it("dynamically updates fields when switching customer sessions", () => {
    const { rerender } = render(
      <BookDeliveryForm
        customerName="Luna"
        customerPhone="0712345678"
        defaultAddress="123, ABC Street"
        defaultCity="Colombo"
        userEmail="luneskie23@gmail.com"
      />
    );

    expect((screen.getByPlaceholderText(/sender name/i) as HTMLInputElement).value).toBe("Luna");
    expect((screen.getByPlaceholderText(/street address, apartment/i) as HTMLInputElement).value).toBe("123, ABC Street");

    // Account switched to another user
    rerender(
      <BookDeliveryForm
        customerName="Haseetha Manuravi"
        customerPhone="+94773686920"
        defaultAddress=""
        defaultCity=""
        userEmail="customer@nexdrop.lk"
      />
    );

    expect((screen.getByPlaceholderText(/sender name/i) as HTMLInputElement).value).toBe("Haseetha Manuravi");
    expect((screen.getAllByPlaceholderText(/\+94 7X XXX XXXX/i)[0] as HTMLInputElement).value).toBe("+94773686920");
    expect((screen.getByPlaceholderText(/street address, apartment/i) as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText(/colombo, kandy/i) as HTMLInputElement).value).toBe("");
  });
});
