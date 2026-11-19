/**
 * Pricing DTOs matching backend FastAPI schemas (snake_case).
 */

export interface AdminPricingRulesDTO {
  currency: string;
  currency_symbol: string;
  base_fare: number;
  per_km_rate: number;
  express_surcharge: number;
  peak_surge_max: number;
  rain_surge: number;
  base_distance_km: number;
  algorithmic_surge_active: boolean;
  updated_at?: string | null;
}

export interface AdminPricingRulesUpdateDTO {
  currency?: string;
  currency_symbol?: string;
  base_fare?: number;
  per_km_rate?: number;
  express_surcharge?: number;
  peak_surge_max?: number;
  rain_surge?: number;
  base_distance_km?: number;
  algorithmic_surge_active?: boolean;
}

export interface PricingTierDTO {
  id: number;
  name: string;
  base_rate: number;
  per_km_rate: number;
  per_kg_rate: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

