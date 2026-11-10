export interface DeliveryDestination {
  city: string;
  district?: string;
  province: string;
  distanceKm: number;
  standardDays: string;
}

/**
 * All 25 Administrative Districts of Sri Lanka across the 9 Provinces.
 * Each entry holds the regional hub city, province, distance from Colombo, and typical transit SLA.
 */
export const SRI_LANKA_HUBS: DeliveryDestination[] = [
  // Western Province (3 districts)
  { city: "Colombo Local", district: "Colombo", province: "Western", distanceKm: 12, standardDays: "Same-Day / 24h" },
  { city: "Greater Colombo / Gampaha", district: "Gampaha", province: "Western", distanceKm: 28, standardDays: "Next-Day" },
  { city: "Kalutara", district: "Kalutara", province: "Western", distanceKm: 42, standardDays: "Next-Day" },

  // Central Province (3 districts)
  { city: "Kandy", district: "Kandy", province: "Central", distanceKm: 115, standardDays: "1-2 Days" },
  { city: "Matale", district: "Matale", province: "Central", distanceKm: 142, standardDays: "1-2 Days" },
  { city: "Nuwara Eliya", district: "Nuwara Eliya", province: "Central", distanceKm: 165, standardDays: "1-2 Days" },

  // Southern Province (3 districts)
  { city: "Galle", district: "Galle", province: "Southern", distanceKm: 125, standardDays: "1-2 Days" },
  { city: "Matara", district: "Matara", province: "Southern", distanceKm: 160, standardDays: "1-2 Days" },
  { city: "Hambantota", district: "Hambantota", province: "Southern", distanceKm: 235, standardDays: "2-3 Days" },

  // North Western Province (2 districts)
  { city: "Kurunegala", district: "Kurunegala", province: "North Western", distanceKm: 95, standardDays: "1-2 Days" },
  { city: "Puttalam", district: "Puttalam", province: "North Western", distanceKm: 130, standardDays: "1-2 Days" },

  // North Central Province (2 districts)
  { city: "Anuradhapura", district: "Anuradhapura", province: "North Central", distanceKm: 205, standardDays: "2-3 Days" },
  { city: "Polonnaruwa", district: "Polonnaruwa", province: "North Central", distanceKm: 215, standardDays: "2-3 Days" },

  // Northern Province (5 districts)
  { city: "Jaffna", district: "Jaffna", province: "Northern", distanceKm: 395, standardDays: "2-3 Days" },
  { city: "Kilinochchi", district: "Kilinochchi", province: "Northern", distanceKm: 330, standardDays: "2-3 Days" },
  { city: "Mannar", district: "Mannar", province: "Northern", distanceKm: 310, standardDays: "2-3 Days" },
  { city: "Mullaitivu", district: "Mullaitivu", province: "Northern", distanceKm: 345, standardDays: "2-3 Days" },
  { city: "Vavuniya", district: "Vavuniya", province: "Northern", distanceKm: 255, standardDays: "2-3 Days" },

  // Eastern Province (3 districts)
  { city: "Batticaloa", district: "Batticaloa", province: "Eastern", distanceKm: 310, standardDays: "2-3 Days" },
  { city: "Ampara", district: "Ampara", province: "Eastern", distanceKm: 320, standardDays: "2-3 Days" },
  { city: "Trincomalee", district: "Trincomalee", province: "Eastern", distanceKm: 260, standardDays: "2-3 Days" },

  // Uva Province (2 districts)
  { city: "Badulla", district: "Badulla", province: "Uva", distanceKm: 215, standardDays: "2-3 Days" },
  { city: "Monaragala", district: "Monaragala", province: "Uva", distanceKm: 240, standardDays: "2-3 Days" },

  // Sabaragamuwa Province (2 districts)
  { city: "Ratnapura", district: "Ratnapura", province: "Sabaragamuwa", distanceKm: 100, standardDays: "1-2 Days" },
  { city: "Kegalle", district: "Kegalle", province: "Sabaragamuwa", distanceKm: 78, standardDays: "1-2 Days" },
];

export interface ServiceTierOption {
  id: "standard" | "express" | "same_day";
  name: string;
  tagline: string;
  badge?: string;
  speed: string;
  surcharge: number;
}

export const SERVICE_TIERS: ServiceTierOption[] = [
  {
    id: "standard",
    name: "Standard Delivery",
    tagline: "Reliable and cost-effective delivery across all provinces",
    speed: "2 - 3 Business Days",
    surcharge: 0,
  },
  {
    id: "express",
    name: "Island-wide Express",
    tagline: "Priority handling with next-day morning dispatch",
    badge: "Popular",
    speed: "Next-Day Delivery",
    surcharge: 150,
  },
  {
    id: "same_day",
    name: "Same-Day Priority",
    tagline: "Dedicated courier dispatch for time-critical parcels",
    badge: "Fastest",
    speed: "Within 6 - 12 Hours",
    surcharge: 300,
  },
];
