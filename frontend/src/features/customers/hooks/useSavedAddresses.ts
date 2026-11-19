"use client";

import { useState, useEffect } from "react";
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} from "../api/customer.api";
import type { CustomerAddressDTO } from "../api/customer.dto";

export type AddressType = "pickup" | "dropoff";

export interface SavedAddress {
  id: string;
  addressType: AddressType;
  label: "Home" | "Office" | "Warehouse" | "Client" | "Store" | "Other";
  customName?: string;
  address: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
  contactName?: string;
  phone?: string;
}

export const SAVED_ADDRESSES_STORAGE_KEY = "nexdrop_customer_saved_addresses";
export const DEFAULT_PICKUP_STORAGE_KEY = "nexdrop_customer_default_pickup";
export const DEFAULT_DROPOFF_STORAGE_KEY = "nexdrop_customer_default_dropoff";

export function mapDtoToSavedAddress(dto: CustomerAddressDTO): SavedAddress {
  return {
    id: String(dto.id),
    addressType: dto.address_type,
    label: (dto.label as SavedAddress["label"]) || "Other",
    customName: dto.custom_name ?? undefined,
    address: dto.address,
    city: dto.city,
    postalCode: dto.postal_code,
    isDefault: dto.is_default,
    contactName: dto.contact_name ?? undefined,
    phone: dto.phone ?? undefined,
  };
}

export function sortAddressesWithDefaultsFirst(list: SavedAddress[]): SavedAddress[] {
  return [...list].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });
}

export function getDefaultAddresses(
  initialAddress = "45/2 Temple Road",
  city = "Colombo 07",
  postalCode = "00700",
  userName = "Dihini Kankanamage"
): SavedAddress[] {
  return [
    {
      id: "1",
      addressType: "pickup",
      label: "Home",
      address: initialAddress,
      city: city,
      postalCode: postalCode,
      isDefault: true,
      contactName: userName,
      phone: "+94 77 123 4567",
    },
    {
      id: "2",
      addressType: "pickup",
      label: "Office",
      address: "Level 12, World Trade Center, Echelon Square",
      city: "Colombo 01",
      postalCode: "00100",
      isDefault: false,
      contactName: userName,
      phone: "+94 77 123 4567",
    },
    {
      id: "3",
      addressType: "pickup",
      label: "Warehouse",
      customName: "Kadawatha Distribution Depot",
      address: "188 Kandy Road",
      city: "Kadawatha",
      postalCode: "11850",
      isDefault: false,
      contactName: "Depot Reception",
      phone: "+94 71 888 9900",
    },
    {
      id: "4",
      addressType: "dropoff",
      label: "Client",
      customName: "Kasun Perera (Client)",
      address: "12 Peradeniya Road",
      city: "Kandy",
      postalCode: "20000",
      isDefault: false,
      contactName: "Kasun Perera",
      phone: "+94 77 987 6543",
    },
    {
      id: "5",
      addressType: "dropoff",
      label: "Store",
      customName: "Galle Retail Branch",
      address: "88 Galle Road",
      city: "Galle",
      postalCode: "80000",
      isDefault: false,
      contactName: "Nimali Silva",
      phone: "+94 71 555 4321",
    },
  ];
}

export function useSavedAddresses(
  initialAddress = "45/2 Temple Road",
  city = "Colombo 07",
  postalCode = "00700",
  userName = "Dihini Kankanamage"
) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(() =>
    sortAddressesWithDefaultsFirst(getDefaultAddresses(initialAddress, city, postalCode, userName))
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      try {
        const stored = localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
            const sorted = sortAddressesWithDefaultsFirst(parsed);
            setAddresses(sorted);
            const defaultPickup = sorted.find((a: SavedAddress) => a.addressType === "pickup" && a.isDefault);
            const defaultDropoff = sorted.find((a: SavedAddress) => a.addressType === "dropoff" && a.isDefault);
            if (defaultPickup) localStorage.setItem(DEFAULT_PICKUP_STORAGE_KEY, JSON.stringify(defaultPickup));
            if (defaultDropoff) localStorage.setItem(DEFAULT_DROPOFF_STORAGE_KEY, JSON.stringify(defaultDropoff));
          }
        }
      } catch {
        // ignore storage errors
      }

      try {
        const backendList = await getCustomerAddresses();
        if (!cancelled && Array.isArray(backendList) && backendList.length > 0) {
          const mapped = sortAddressesWithDefaultsFirst(backendList.map(mapDtoToSavedAddress));
          setAddresses(mapped);
          try {
            localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(mapped));
            const defaultPickup = mapped.find((a) => a.addressType === "pickup" && a.isDefault);
            const defaultDropoff = mapped.find((a) => a.addressType === "dropoff" && a.isDefault);
            if (defaultPickup) localStorage.setItem(DEFAULT_PICKUP_STORAGE_KEY, JSON.stringify(defaultPickup));
            if (defaultDropoff) localStorage.setItem(DEFAULT_DROPOFF_STORAGE_KEY, JSON.stringify(defaultDropoff));
          } catch {
            // ignore
          }
        }
      } catch {
        // offline fallback
      }
    }

    loadAddresses();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveAddresses = (newAddresses: SavedAddress[]) => {
    const sorted = sortAddressesWithDefaultsFirst(newAddresses);
    setAddresses(sorted);
    try {
      localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(sorted));
      const defaultPickup = sorted.find((a) => a.addressType === "pickup" && a.isDefault);
      if (defaultPickup) {
        localStorage.setItem(DEFAULT_PICKUP_STORAGE_KEY, JSON.stringify(defaultPickup));
      } else {
        localStorage.removeItem(DEFAULT_PICKUP_STORAGE_KEY);
      }
      const defaultDropoff = sorted.find((a) => a.addressType === "dropoff" && a.isDefault);
      if (defaultDropoff) {
        localStorage.setItem(DEFAULT_DROPOFF_STORAGE_KEY, JSON.stringify(defaultDropoff));
      } else {
        localStorage.removeItem(DEFAULT_DROPOFF_STORAGE_KEY);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nexdrop_default_address_changed", {
            detail: {
              defaultPickup: defaultPickup || null,
              defaultDropoff: defaultDropoff || null,
            },
          })
        );
      }
    } catch {
      // storage disabled
    }
  };

  const setDefault = (id: string) => {
    const target = addresses.find((a) => a.id === id);
    if (!target) return;
    const targetType = target.addressType;
    const updated = addresses.map((a) => {
      if (a.addressType === targetType) {
        return { ...a, isDefault: a.id === id };
      }
      return a;
    });
    saveAddresses(updated);
    const numId = parseInt(id, 10);
    if (!Number.isNaN(numId)) {
      setDefaultCustomerAddress(numId).catch((err) =>
        console.warn("[SavedAddresses] Backend default update failed:", err)
      );
    }
  };

  const unsetDefault = (id: string) => {
    const updated = addresses.map((a) => {
      if (a.id === id) {
        return { ...a, isDefault: false };
      }
      return a;
    });
    saveAddresses(updated);
    const numId = parseInt(id, 10);
    if (!Number.isNaN(numId)) {
      updateCustomerAddress(numId, { is_default: false }).catch((err) =>
        console.warn("[SavedAddresses] Backend unset default failed:", err)
      );
    }
  };

  const deleteAddress = (id: string) => {
    saveAddresses(addresses.filter((a) => a.id !== id));
    const numId = parseInt(id, 10);
    if (!Number.isNaN(numId)) {
      deleteCustomerAddress(numId).catch((err) =>
        console.warn("[SavedAddresses] Backend delete failed:", err)
      );
    }
  };

  const addAddress = async (entry: Omit<SavedAddress, "id" | "isDefault">) => {
    const tempId = `addr-${Date.now()}`;
    const newEntry: SavedAddress = {
      ...entry,
      id: tempId,
      isDefault: addresses.length === 0,
    };
    saveAddresses([...addresses, newEntry]);

    try {
      const created = await createCustomerAddress({
        address_type: entry.addressType,
        label: entry.label,
        custom_name: entry.customName,
        address: entry.address,
        city: entry.city,
        postal_code: entry.postalCode,
        contact_name: entry.contactName,
        phone: entry.phone,
        is_default: addresses.length === 0,
      });
      if (created) {
        const mapped = mapDtoToSavedAddress(created);
        setAddresses((prev) =>
          prev.map((a) => (a.id === tempId ? mapped : a))
        );
      }
    } catch (err) {
      console.warn("[SavedAddresses] Backend address creation failed:", err);
    }
  };

  const updateAddress = (id: string, updated: Partial<SavedAddress>) => {
    const target = addresses.find((a) => a.id === id);
    const targetType = updated.addressType || target?.addressType;

    const updatedList = addresses.map((a) => {
      if (a.id === id) {
        return { ...a, ...updated };
      }
      if (updated.isDefault === true && targetType && a.addressType === targetType) {
        return { ...a, isDefault: false };
      }
      return a;
    });

    saveAddresses(updatedList);

    const numId = parseInt(id, 10);
    if (!Number.isNaN(numId)) {
      if (updated.isDefault === true) {
        setDefaultCustomerAddress(numId).catch((err) =>
          console.warn("[SavedAddresses] Backend default update failed:", err)
        );
      }
      updateCustomerAddress(numId, {
        address_type: updated.addressType,
        label: updated.label,
        custom_name: updated.customName,
        address: updated.address,
        city: updated.city,
        postal_code: updated.postalCode,
        contact_name: updated.contactName,
        phone: updated.phone,
        is_default: updated.isDefault,
      }).catch((err) =>
        console.warn("[SavedAddresses] Backend address update failed:", err)
      );
    }
  };

  return {
    addresses,
    setDefault,
    unsetDefault,
    deleteAddress,
    addAddress,
    updateAddress,
    setAddresses: saveAddresses,
  };
}
