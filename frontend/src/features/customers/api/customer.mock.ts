import type {
  CustomerMeDTO,
  CustomerDashboardSummaryDTO,
  CustomerParcelListDTO,
  CustomerParcelDetailDTO,
} from "./customer.dto";

export const MOCK_CUSTOMER_ME: CustomerMeDTO = {
  id: 1,
  full_name: "",
  email: "",
  phone: "",
  role: "customer",
  default_address: "",
  city: "",
  postal_code: "",
};

// Test fixtures specifically for unit test suites and single tracking lookups
const TEST_FIXTURES: Record<string, CustomerParcelDetailDTO> = {
  "NXD-CUS-101": {
    tracking_id: "NXD-CUS-101",
    recipient_name: "Kasun Perera",
    recipient_phone: "+94 77 987 6543",
    recipient_phone_masked: "+94 77 ••• ••89",
    sender_name: "Dihini Kankanamage",
    delivery_address: "12 Peradeniya Road",
    delivery_city: "Kandy",
    pickup_address: "45/2 Temple Road",
    pickup_city: "Colombo 07",
    status: "delivered",
    created_at: "2026-11-06T09:30:00Z",
    delivered_at: "2026-11-08T15:45:00Z",
    eta: "2026-11-08T16:00:00Z",
    fee: 650,
    weight_kg: 1.5,
    dimensions: "25x20x10 cm",
    special_instructions: "Handle with care - fragile electronics",
    notes: [],
    delivery_passcode: "482915",
    delivery_passcode_verified: true,
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-11-06T09:30:00Z",
        location: "Colombo Portal",
      },
      {
        status: "picked_up",
        label: "Picked Up by Courier",
        occurred_at: "2026-11-06T14:15:00Z",
        location: "Colombo 07",
      },
      {
        status: "in_transit",
        label: "Sorted at Central Hub",
        occurred_at: "2026-11-07T03:40:00Z",
        location: "Peliyagoda Hub",
      },
      {
        status: "out_for_delivery",
        label: "Out for Delivery",
        occurred_at: "2026-11-08T08:20:00Z",
        location: "Kandy Dispatch Station",
      },
      {
        status: "delivered",
        label: "Delivered & Signed",
        occurred_at: "2026-11-08T15:45:00Z",
        location: "Kandy Recipient Address",
      },
    ],
  },
  "NXD-CUS-102": {
    tracking_id: "NXD-CUS-102",
    recipient_name: "Nimali Silva",
    recipient_phone_masked: "+94 71 ••• ••42",
    sender_name: "Dihini Kankanamage",
    delivery_address: "88 Galle Road",
    delivery_city: "Galle",
    pickup_address: "45/2 Temple Road",
    pickup_city: "Colombo 07",
    status: "in_transit",
    created_at: "2026-11-08T11:00:00Z",
    eta: "2026-11-10T14:00:00Z",
    fee: 550,
    weight_kg: 0.8,
    dimensions: "20x15x5 cm",
    special_instructions: "Deliver between 9 AM and 5 PM",
    notes: [],
    delivery_passcode: "719302",
    delivery_passcode_verified: false,
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: "2026-11-08T11:00:00Z",
        location: "Colombo Portal",
      },
      {
        status: "picked_up",
        label: "Collected from Sender",
        occurred_at: "2026-11-08T16:30:00Z",
        location: "Colombo 07",
      },
      {
        status: "in_transit",
        label: "Arrived at Southern Hub",
        occurred_at: "2026-11-09T05:10:00Z",
        location: "Galle Hub",
      },
    ],
  },
};

// Clean slate: 0 dummy orders for clean live dashboard initialization
export const MOCK_CUSTOMER_PARCELS: CustomerParcelDetailDTO[] = [];

let activeCustomerUserKey: string | null = null;
let lastSyncedUserKey: string | null = null;

export function setActiveCustomerUserKey(key: string | null): void {
  const clean = key ? key.trim().toLowerCase() : null;
  if (clean !== activeCustomerUserKey) {
    activeCustomerUserKey = clean;
    // Wipe out in-memory parcels of the previous user immediately
    MOCK_CUSTOMER_PARCELS.length = 0;
    lastSyncedUserKey = null;
  }
}

export function getCurrentCustomerUserKey(): string {
  if (activeCustomerUserKey) {
    return activeCustomerUserKey;
  }
  if (typeof window === "undefined") return "default";

  try {
    // 1. Check Supabase auth token stored in localStorage (sb-<project>-auth-token)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          const email = parsed?.user?.email || parsed?.user?.id;
          if (email) {
            const clean = String(email).trim().toLowerCase();
            activeCustomerUserKey = clean;
            return clean;
          }
        }
      }
    }

    // 2. Check cached profile in localStorage
    const cachedProfile = localStorage.getItem("nexdrop_current_user_profile");
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      const email = parsed?.email || parsed?.user?.email || parsed?.full_name;
      if (email) {
        const clean = String(email).trim().toLowerCase();
        activeCustomerUserKey = clean;
        return clean;
      }
    }

    // 3. Check document.cookie for supabase auth token
    const cookieMatch = document.cookie.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (cookieMatch) {
      const decoded = decodeURIComponent(cookieMatch[1]);
      const parsed = JSON.parse(decoded);
      const email = parsed?.user?.email || parsed?.[0]?.user?.email;
      if (email) {
        const clean = String(email).trim().toLowerCase();
        activeCustomerUserKey = clean;
        return clean;
      }
    }
  } catch {
    // ignore
  }

  return "default";
}

export function getCustomerParcelsStorageKey(userKey?: string): string {
  const effectiveKey = (userKey || getCurrentCustomerUserKey()).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `nexdrop_customer_parcels_${effectiveKey}`;
}

export function syncMockParcelsFromStorage(userKey?: string): void {
  if (typeof window === "undefined") return;
  const currentKey = userKey || getCurrentCustomerUserKey();

  // Clean legacy shared storage if still present to maintain confidentiality
  try {
    if (localStorage.getItem("nexdrop_customer_parcels")) {
      localStorage.removeItem("nexdrop_customer_parcels");
    }
  } catch {
    // ignore
  }

  // Clear in-memory array whenever user key switches
  if (lastSyncedUserKey !== null && lastSyncedUserKey !== currentKey) {
    MOCK_CUSTOMER_PARCELS.length = 0;
  }
  lastSyncedUserKey = currentKey;

  try {
    const storageKey = getCustomerParcelsStorageKey(currentKey);
    const raw = localStorage.getItem(storageKey);
    MOCK_CUSTOMER_PARCELS.length = 0;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        MOCK_CUSTOMER_PARCELS.push(...parsed);
      }
    }
  } catch {
    // Ignore storage read errors
  }
}

export function syncMockParcelsToStorage(userKey?: string): void {
  if (typeof window === "undefined") return;
  const currentKey = userKey || getCurrentCustomerUserKey();
  try {
    const storageKey = getCustomerParcelsStorageKey(currentKey);
    localStorage.setItem(storageKey, JSON.stringify(MOCK_CUSTOMER_PARCELS));
    window.dispatchEvent(new CustomEvent("nexdrop:parcel-status-updated"));
  } catch {
    // Ignore storage write errors
  }
}

export function getMockDashboardSummary(): CustomerDashboardSummaryDTO {
  syncMockParcelsFromStorage();
  const activeStatuses = new Set(["picked_up", "in_transit", "out_for_delivery"]);
  const activeDeliveries = MOCK_CUSTOMER_PARCELS.filter((p) =>
    activeStatuses.has(p.status)
  ).length;
  const delivered = MOCK_CUSTOMER_PARCELS.filter(
    (p) => p.status === "delivered"
  ).length;
  const pending = MOCK_CUSTOMER_PARCELS.filter(
    (p) => p.status === "pending"
  ).length;
  const cancelled = MOCK_CUSTOMER_PARCELS.filter(
    (p) => p.status === "cancelled"
  ).length;
  const totalOrders = MOCK_CUSTOMER_PARCELS.length;

  const now = new Date();
  const weeklyOrders = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const orders = MOCK_CUSTOMER_PARCELS.filter((p) =>
      p.created_at.startsWith(dateStr)
    ).length;
    weeklyOrders.push({ date: dateStr, orders });
  }

  return {
    totals: {
      total_orders: totalOrders,
      active_deliveries: activeDeliveries,
      delivered,
      pending,
      cancelled,
    },
    kpis: [
      { key: "active_deliveries", value: activeDeliveries, delta_pct: 0 },
      { key: "delivered", value: delivered, delta_pct: 0 },
      { key: "pending", value: pending, delta_pct: 0 },
      { key: "total_orders", value: totalOrders, delta_pct: 0 },
    ],
    weekly_orders: weeklyOrders,
  };
}

export function filterMockParcels(
  status?: string,
  limit = 50,
  offset = 0
): CustomerParcelListDTO {
  syncMockParcelsFromStorage();
  let list = MOCK_CUSTOMER_PARCELS;
  if (status && status !== "all") {
    const allowed = status.split(",").map((s) => s.trim());
    if (allowed.includes("active")) {
      const activeGroup = new Set(["picked_up", "in_transit", "out_for_delivery"]);
      list = list.filter((p) => activeGroup.has(p.status));
    } else {
      list = list.filter((p) => allowed.includes(p.status));
    }
  }

  const items = list.slice(offset, offset + limit).map((p) => ({
    tracking_id: p.tracking_id,
    recipient_name: p.recipient_name,
    destination: p.delivery_city,
    status: p.status,
    created_at: p.created_at,
    estimated_fee: p.fee,
    weight_kg: p.weight_kg,
    eta: p.eta,
    delivery_passcode: p.delivery_passcode,
  }));

  return {
    items,
    total: list.length,
  };
}

export function getMockCustomerParcelDetail(
  trackingId: string
): CustomerParcelDetailDTO {
  syncMockParcelsFromStorage();
  const clean = trackingId.trim().toUpperCase();
  const parcel = MOCK_CUSTOMER_PARCELS.find(
    (p) => p.tracking_id.toUpperCase() === clean
  );
  if (parcel) return parcel;

  // Search cross-user storage keys for direct tracking lookup by tracking number
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("nexdrop_customer_parcels_")) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const found = list.find(
                (p: CustomerParcelDetailDTO) => p.tracking_id.toUpperCase() === clean
              );
              if (found) return found;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (TEST_FIXTURES[clean]) return TEST_FIXTURES[clean];
  throw new Error(`Parcel ${trackingId} not found`);
}

export function updateMockCustomerParcelStatus(
  trackingId: string,
  newStatus: CustomerParcelDetailDTO["status"],
  note?: string,
  location?: string
): CustomerParcelDetailDTO {
  syncMockParcelsFromStorage();
  const clean = trackingId.trim().toUpperCase();
  let parcel = MOCK_CUSTOMER_PARCELS.find((p) => p.tracking_id.toUpperCase() === clean);
  const fixture = TEST_FIXTURES[clean];
  if (!parcel && fixture) {
    const cloned = JSON.parse(JSON.stringify(fixture)) as CustomerParcelDetailDTO;
    MOCK_CUSTOMER_PARCELS.unshift(cloned);
    parcel = cloned;
  }
  if (!parcel) {
    throw new Error(`Parcel ${trackingId} not found`);
  }
  parcel.status = newStatus;
  const now = new Date().toISOString();
  if (newStatus === "delivered") {
    parcel.delivered_at = now;
    parcel.delivery_passcode_verified = true;
  }
  const statusLabels: Record<string, string> = {
    pending: "Order Created",
    picked_up: "Picked Up by Courier",
    in_transit: "Sorted at Central Hub",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered & Signed",
    cancelled: "Shipment Cancelled",
  };
  parcel.timeline.push({
    status: newStatus,
    label: statusLabels[newStatus] || newStatus,
    occurred_at: now,
    location: location || "Central Logistics Hub",
  });
  if (note) {
    parcel.notes.push(note);
  }
  syncMockParcelsToStorage();
  return parcel;
}

export function cancelMockCustomerParcel(
  trackingId: string,
  reason?: string
): CustomerParcelDetailDTO {
  syncMockParcelsFromStorage();
  const clean = trackingId.trim().toUpperCase();
  let parcel = MOCK_CUSTOMER_PARCELS.find((p) => p.tracking_id.toUpperCase() === clean);
  const fixture = TEST_FIXTURES[clean];
  if (!parcel && fixture) {
    const cloned = JSON.parse(JSON.stringify(fixture)) as CustomerParcelDetailDTO;
    MOCK_CUSTOMER_PARCELS.unshift(cloned);
    parcel = cloned;
  }
  if (!parcel) {
    throw new Error(`Parcel ${trackingId} not found`);
  }
  parcel.status = "cancelled";
  parcel.timeline.push({
    status: "cancelled",
    label: "Cancelled by Customer",
    occurred_at: new Date().toISOString(),
    location: "Online Portal",
  });
  if (reason) {
    parcel.notes.push(`Cancellation reason: ${reason}`);
  }
  syncMockParcelsToStorage();
  return parcel;
}

export function createMockCustomerParcel(
  payload: {
    recipient_name: string;
    recipient_phone: string;
    delivery_address: string;
    delivery_city: string;
    pickup_address?: string;
    pickup_city?: string;
    weight_kg: number;
    dimensions?: string;
    special_instructions?: string;
    fee?: number;
    delivery_passcode?: string;
    sender_name?: string;
    sender_email?: string;
  }
): CustomerParcelDetailDTO {
  const userKey = payload.sender_email?.trim().toLowerCase() || getCurrentCustomerUserKey();
  if (userKey && userKey !== "default") {
    setActiveCustomerUserKey(userKey);
  }
  syncMockParcelsFromStorage(userKey);
  const trackingId = `NXD-CUS-${100 + MOCK_CUSTOMER_PARCELS.length + 1}`;
  const now = new Date().toISOString();
  const senderName = payload.sender_name || MOCK_CUSTOMER_ME.full_name || "Customer";
  const parcel: CustomerParcelDetailDTO = {
    tracking_id: trackingId,
    recipient_name: payload.recipient_name,
    recipient_phone_masked:
      payload.recipient_phone.length > 7
        ? payload.recipient_phone.slice(0, 7) + " *** " + payload.recipient_phone.slice(-4)
        : payload.recipient_phone,
    sender_name: senderName,
    delivery_address: payload.delivery_address,
    delivery_city: payload.delivery_city,
    pickup_address: payload.pickup_address || MOCK_CUSTOMER_ME.default_address,
    pickup_city: payload.pickup_city || MOCK_CUSTOMER_ME.city,
    status: "pending",
    created_at: now,
    eta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    fee: payload.fee || 350.0,
    weight_kg: payload.weight_kg,
    dimensions: payload.dimensions || "20 x 15 x 10 cm",
    special_instructions: payload.special_instructions || null,
    delivery_passcode:
      payload.delivery_passcode ||
      String(Math.floor(100000 + Math.random() * 900000)),
    delivery_passcode_verified: false,
    notes: [],
    timeline: [
      {
        status: "pending",
        label: "Order Created",
        occurred_at: now,
        location: "Online Portal",
      },
    ],
  };
  (parcel as any).user_key = userKey;
  MOCK_CUSTOMER_PARCELS.unshift(parcel);
  syncMockParcelsToStorage(userKey);
  return parcel;
}

