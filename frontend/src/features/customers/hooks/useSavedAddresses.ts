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

export function normalizeAddressKey(
  addr: string,
  city = "",
  type: AddressType = "pickup"
): string {
  let cleanAddr = (addr || "")
    .trim()
    .toLowerCase()
    .replace(/[,\s.-]+/g, " ");
  const cleanCity = (city || "")
    .trim()
    .toLowerCase()
    .replace(/[,\s.-]+/g, " ");
  if (cleanCity && cleanAddr.endsWith(cleanCity)) {
    cleanAddr = cleanAddr.slice(0, -cleanCity.length).trim();
  }
  return `${type}:::${cleanAddr}:::${cleanCity}`;
}

export function deduplicateAddresses(list: SavedAddress[]): SavedAddress[] {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, SavedAddress>();

  for (const item of list) {
    if (!item || !item.address?.trim()) continue;
    const key = normalizeAddressKey(item.address, item.city || "", item.addressType);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item });
    } else {
      const isDefault = Boolean(existing.isDefault || item.isDefault);
      const contactName = existing.contactName || item.contactName;
      const phone = existing.phone || item.phone;
      const customName = existing.customName || item.customName;
      const postalCode = existing.postalCode || item.postalCode;
      const label = existing.label && existing.label !== "Other" ? existing.label : item.label;
      const preferItemId = !Number.isNaN(Number(item.id)) && Number.isNaN(Number(existing.id));
      const id = preferItemId ? item.id : existing.id;

      map.set(key, {
        ...existing,
        id,
        label,
        customName,
        postalCode,
        isDefault,
        contactName,
        phone,
      });
    }
  }

  return sortAddressesWithDefaultsFirst(Array.from(map.values()));
}

export function getDefaultAddresses(
  initialAddress = "",
  city = "",
  postalCode = "",
  userName = "",
  userPhone = ""
): SavedAddress[] {
  if (!initialAddress && !city) {
    return [];
  }
  return [
    {
      id: "1",
      addressType: "pickup",
      label: "Home",
      address: initialAddress,
      city: city,
      postalCode: postalCode,
      isDefault: true,
      contactName: userName || "",
      phone: userPhone || "",
    },
  ];
}

export function useSavedAddresses(
  initialAddress = "",
  city = "",
  postalCode = "",
  userName = "",
  userPhone = ""
) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(() =>
    deduplicateAddresses(
      getDefaultAddresses(initialAddress, city, postalCode, userName, userPhone)
    )
  );

  const userStorageKey = userName
    ? `${SAVED_ADDRESSES_STORAGE_KEY}_${userName.trim().toLowerCase().replace(/\s+/g, "_")}`
    : SAVED_ADDRESSES_STORAGE_KEY;

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      try {
        const stored = localStorage.getItem(userStorageKey) || (!userName ? localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY) : null);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && !cancelled) {
            const clean = parsed.filter(
              (a: SavedAddress) =>
                !(a.address === "45/2 Temple Road" && a.city === "Colombo 07" && a.postalCode === "00700" && !userName)
            );
            if (clean.length > 0) {
              const updated = clean.map((a: SavedAddress) => {
                if (a.isDefault && a.addressType === "pickup") {
                  return {
                    ...a,
                    address: initialAddress || a.address,
                    city: city || a.city,
                    postalCode: postalCode || a.postalCode,
                    contactName: userName || a.contactName,
                    phone: a.phone || userPhone || "",
                  };
                }
                return a;
              });

              // Automatically ensure customer's pickup address is saved if not already present
              const initialKey = (initialAddress || city) ? normalizeAddressKey(initialAddress, city, "pickup") : null;
              const hasMatchingPickup = initialKey ? updated.some(a => normalizeAddressKey(a.address, a.city, a.addressType) === initialKey) : false;
              if (!hasMatchingPickup && (initialAddress || city)) {
                updated.unshift({
                  id: "profile-pickup",
                  addressType: "pickup",
                  label: "Home",
                  address: initialAddress,
                  city: city,
                  postalCode: postalCode || "00100",
                  isDefault: true,
                  contactName: userName || "",
                  phone: userPhone || "",
                });
              }

              const deduped = deduplicateAddresses(updated);
              setAddresses(deduped);
              try {
                localStorage.setItem(userStorageKey, JSON.stringify(deduped));
                localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(deduped));
              } catch {}
              const defaultPickup = deduped.find((a: SavedAddress) => a.addressType === "pickup" && a.isDefault);
              const defaultDropoff = deduped.find((a: SavedAddress) => a.addressType === "dropoff" && a.isDefault);
              if (defaultPickup) localStorage.setItem(DEFAULT_PICKUP_STORAGE_KEY, JSON.stringify(defaultPickup));
              if (defaultDropoff) localStorage.setItem(DEFAULT_DROPOFF_STORAGE_KEY, JSON.stringify(defaultDropoff));
            } else if (initialAddress || city) {
              const def = deduplicateAddresses(
                getDefaultAddresses(initialAddress, city, postalCode, userName, userPhone)
              );
              setAddresses(def);
            }
          }
        } else if (initialAddress || city) {
          const def = deduplicateAddresses(
            getDefaultAddresses(initialAddress, city, postalCode, userName, userPhone)
          );
          setAddresses(def);
        }
      } catch {
        // ignore storage errors
      }

      try {
        const backendList = await getCustomerAddresses();
        if (!cancelled && Array.isArray(backendList) && backendList.length > 0) {
          const mapped = backendList.map(mapDtoToSavedAddress);
          const enriched = mapped.map((a) => {
            if (a.isDefault && a.addressType === "pickup" && !a.phone && userPhone) {
              return { ...a, phone: userPhone };
            }
            return a;
          });

          // Automatically ensure customer's pickup address is present if missing from backend list
          const initialKey = (initialAddress || city) ? normalizeAddressKey(initialAddress, city, "pickup") : null;
          const hasMatchingPickup = initialKey ? enriched.some(a => normalizeAddressKey(a.address, a.city, a.addressType) === initialKey) : false;
          if (!hasMatchingPickup && (initialAddress || city)) {
            enriched.unshift({
              id: "profile-pickup",
              addressType: "pickup",
              label: "Home",
              address: initialAddress,
              city: city,
              postalCode: postalCode || "00100",
              isDefault: true,
              contactName: userName || "",
              phone: userPhone || "",
            });
          }

          const deduped = deduplicateAddresses(enriched);
          setAddresses(deduped);
          try {
            localStorage.setItem(userStorageKey, JSON.stringify(deduped));
            localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(deduped));
            const defaultPickup = deduped.find((a) => a.addressType === "pickup" && a.isDefault);
            const defaultDropoff = deduped.find((a) => a.addressType === "dropoff" && a.isDefault);
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
  }, [initialAddress, city, postalCode, userName, userPhone, userStorageKey]);

  useEffect(() => {
    if (initialAddress || userPhone || userName) {
      setAddresses((prev) => {
        const initialKey = (initialAddress || city) ? normalizeAddressKey(initialAddress, city, "pickup") : null;
        const existingIdx = initialKey ? prev.findIndex(a => normalizeAddressKey(a.address, a.city, a.addressType) === initialKey) : -1;
        let nextList: SavedAddress[];
        if (existingIdx >= 0) {
          nextList = prev.map((a, idx) =>
            idx === existingIdx
              ? {
                  ...a,
                  address: initialAddress || a.address,
                  city: city || a.city,
                  postalCode: postalCode || a.postalCode,
                  contactName: userName || a.contactName,
                  phone: userPhone || a.phone,
                }
              : a
          );
        } else if (initialAddress || city) {
          nextList = [
            {
              id: "profile-pickup",
              addressType: "pickup",
              label: "Home",
              address: initialAddress,
              city: city,
              postalCode: postalCode || "00100",
              isDefault: true,
              contactName: userName || "",
              phone: userPhone || "",
            },
            ...prev,
          ];
        } else {
          nextList = prev;
        }
        return deduplicateAddresses(nextList);
      });
    }
  }, [initialAddress, city, postalCode, userName, userPhone]);

  const saveAddresses = (newAddresses: SavedAddress[]) => {
    const deduped = deduplicateAddresses(newAddresses);
    setAddresses(deduped);
    try {
      localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(deduped));
      if (userName) {
        localStorage.setItem(userStorageKey, JSON.stringify(deduped));
      }
      const defaultPickup = deduped.find((a) => a.addressType === "pickup" && a.isDefault);
      if (defaultPickup) {
        localStorage.setItem(DEFAULT_PICKUP_STORAGE_KEY, JSON.stringify(defaultPickup));
      } else {
        localStorage.removeItem(DEFAULT_PICKUP_STORAGE_KEY);
      }
      const defaultDropoff = deduped.find((a) => a.addressType === "dropoff" && a.isDefault);
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
    const entryKey = normalizeAddressKey(entry.address, entry.city, entry.addressType);
    const existing = addresses.find(
      (a) => normalizeAddressKey(a.address, a.city, a.addressType) === entryKey
    );
    if (existing) {
      updateAddress(existing.id, entry);
      return;
    }

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
          deduplicateAddresses(prev.map((a) => (a.id === tempId ? mapped : a)))
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

export function autoSaveUsedAddress({
  addressType,
  address,
  city,
  postalCode = "00100",
  contactName = "",
  phone = "",
  label = addressType === "pickup" ? "Home" : "Client",
  userName = "",
}: {
  addressType: AddressType;
  address: string;
  city: string;
  postalCode?: string;
  contactName?: string;
  phone?: string;
  label?: SavedAddress["label"];
  userName?: string;
}): void {
  if (typeof window === "undefined") return;
  const cleanAddress = address.trim();
  const cleanCity = city.trim();
  if (!cleanAddress || !cleanCity) return;

  const targetKey = normalizeAddressKey(cleanAddress, cleanCity, addressType);
  const genericKey = SAVED_ADDRESSES_STORAGE_KEY;
  const userKey = userName
    ? `${SAVED_ADDRESSES_STORAGE_KEY}_${userName.trim().toLowerCase().replace(/\s+/g, "_")}`
    : null;

  const storageKeys = [genericKey];
  if (userKey && !storageKeys.includes(userKey)) {
    storageKeys.push(userKey);
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nexdrop_customer_saved_addresses_") && !storageKeys.includes(k)) {
        storageKeys.push(k);
      }
    }
  } catch {
    // ignore
  }

  for (const key of storageKeys) {
    try {
      const stored = localStorage.getItem(key);
      let list: SavedAddress[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          list = deduplicateAddresses(parsed);
        }
      }

      const existingIdx = list.findIndex(
        (a) => normalizeAddressKey(a.address, a.city, a.addressType) === targetKey
      );

      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          city: cleanCity || list[existingIdx].city,
          postalCode: postalCode.trim() || list[existingIdx].postalCode,
          contactName: contactName.trim() || list[existingIdx].contactName,
          phone: phone.trim() || list[existingIdx].phone,
        };
      } else {
        const hasDefault = list.some((a) => a.addressType === addressType && a.isDefault);
        const newAddress: SavedAddress = {
          id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          addressType,
          label,
          address: cleanAddress,
          city: cleanCity,
          postalCode: postalCode.trim() || "00100",
          contactName: contactName.trim() || userName,
          phone: phone.trim(),
          isDefault: addressType === "pickup" && !hasDefault,
        };
        list.push(newAddress);
      }

      const deduped = deduplicateAddresses(list);
      localStorage.setItem(key, JSON.stringify(deduped));

      const defaultPickup = deduped.find((a) => a.addressType === "pickup" && a.isDefault);
      const defaultDropoff = deduped.find((a) => a.addressType === "dropoff" && a.isDefault);
      if (defaultPickup) localStorage.setItem(DEFAULT_PICKUP_STORAGE_KEY, JSON.stringify(defaultPickup));
      if (defaultDropoff) localStorage.setItem(DEFAULT_DROPOFF_STORAGE_KEY, JSON.stringify(defaultDropoff));
    } catch {
      // ignore localStorage errors
    }
  }

  // Also sync with backend asynchronously
  createCustomerAddress({
    address_type: addressType,
    label,
    address: cleanAddress,
    city: cleanCity,
    postal_code: postalCode.trim() || "00100",
    contact_name: contactName.trim() || userName,
    phone: phone.trim(),
    is_default: false,
  }).catch(() => {
    // offline or backend unreachable
  });
}
