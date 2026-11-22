import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeAddressKey,
  deduplicateAddresses,
  autoSaveUsedAddress,
  type SavedAddress,
  SAVED_ADDRESSES_STORAGE_KEY,
} from "./useSavedAddresses";

vi.mock("../api/customer.api", () => ({
  getCustomerAddresses: vi.fn().mockResolvedValue([]),
  createCustomerAddress: vi.fn().mockResolvedValue(null),
  updateCustomerAddress: vi.fn().mockResolvedValue(null),
  deleteCustomerAddress: vi.fn().mockResolvedValue(true),
  setDefaultCustomerAddress: vi.fn().mockResolvedValue(null),
}));

describe("Saved addresses deduplication", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("normalizeAddressKey", () => {
    it("normalizes whitespace, punctuation and casing", () => {
      const key1 = normalizeAddressKey("Castle Street, Colombo", "Colombo", "pickup");
      const key2 = normalizeAddressKey("castle street", "colombo", "pickup");
      expect(key1).toBe(key2);
    });

    it("distinguishes pickup from dropoff for the same street", () => {
      const pickupKey = normalizeAddressKey("Castle Street", "Colombo", "pickup");
      const dropoffKey = normalizeAddressKey("Castle Street", "Colombo", "dropoff");
      expect(pickupKey).not.toBe(dropoffKey);
    });
  });

  describe("deduplicateAddresses", () => {
    it("merges duplicate entries and preserves default status and contact info", () => {
      const raw: SavedAddress[] = [
        {
          id: "addr-1",
          addressType: "pickup",
          label: "Home",
          address: "Castle Street",
          city: "Colombo",
          postalCode: "00100",
          isDefault: false,
          contactName: "Dihini Kankanamage",
          phone: "0710111454",
        },
        {
          id: "addr-2",
          addressType: "pickup",
          label: "Home",
          address: "Castle Street, Colombo",
          city: "Colombo",
          postalCode: "00100",
          isDefault: true,
          contactName: "Dihini Kankanamage",
          phone: "0710111454",
        },
        {
          id: "addr-3",
          addressType: "pickup",
          label: "Home",
          address: "Castle Street",
          city: "Colombo",
          postalCode: "00100",
          isDefault: false,
          contactName: "Dihini Kankanamage",
          phone: "0710111454",
        },
      ];

      const deduped = deduplicateAddresses(raw);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].isDefault).toBe(true);
      expect(deduped[0].contactName).toBe("Dihini Kankanamage");
      expect(deduped[0].phone).toBe("0710111454");
    });
  });

  describe("autoSaveUsedAddress", () => {
    it("does not create duplicate records when called repeatedly with the same address", () => {
      autoSaveUsedAddress({
        addressType: "pickup",
        address: "Castle Street",
        city: "Colombo",
        postalCode: "00100",
        contactName: "Dihini Kankanamage",
        phone: "0710111454",
        userName: "Dihini Kankanamage",
      });

      autoSaveUsedAddress({
        addressType: "pickup",
        address: "Castle Street",
        city: "Colombo",
        postalCode: "00100",
        contactName: "Dihini Kankanamage",
        phone: "0710111454",
        userName: "Dihini Kankanamage",
      });

      autoSaveUsedAddress({
        addressType: "pickup",
        address: "Castle Street, Colombo",
        city: "Colombo",
        postalCode: "00100",
        contactName: "Dihini Kankanamage",
        phone: "0710111454",
        userName: "Dihini Kankanamage",
      });

      const userKey = `${SAVED_ADDRESSES_STORAGE_KEY}_dihini_kankanamage`;
      const stored = JSON.parse(localStorage.getItem(userKey) || "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].address).toBe("Castle Street");
    });
  });
});
