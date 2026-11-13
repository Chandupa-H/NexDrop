import type {
  AdminPricingRulesDTO,
  AdminPricingRulesUpdateDTO,
  PricingTierDTO,
} from "./pricing.dto";

export interface AdminPricingRulesViewModel {
  currency: string;
  currencySymbol: string;
  baseFare: number;
  perKmRate: number;
  expressSurcharge: number;
  peakSurgeMax: number;
  rainSurge: number;
  baseDistanceKm: number;
  algorithmicSurgeActive: boolean;
  updatedAt?: string | null;
}

export const mapAdminPricingRules = (
  dto: AdminPricingRulesDTO
): AdminPricingRulesViewModel => ({
  currency: dto.currency || "LKR",
  currencySymbol: dto.currency_symbol || "Rs.",
  baseFare: dto.base_fare,
  perKmRate: dto.per_km_rate,
  expressSurcharge: dto.express_surcharge,
  peakSurgeMax: dto.peak_surge_max,
  rainSurge: dto.rain_surge,
  baseDistanceKm: dto.base_distance_km,
  algorithmicSurgeActive: dto.algorithmic_surge_active,
  updatedAt: dto.updated_at,
});

export const mapAdminPricingRulesUpdateToDTO = (
  vm: Partial<AdminPricingRulesViewModel>
): AdminPricingRulesUpdateDTO => ({
  currency: vm.currency,
  currency_symbol: vm.currencySymbol,
  base_fare: vm.baseFare,
  per_km_rate: vm.perKmRate,
  express_surcharge: vm.expressSurcharge,
  peak_surge_max: vm.peakSurgeMax,
  rain_surge: vm.rainSurge,
  base_distance_km: vm.baseDistanceKm,
  algorithmic_surge_active: vm.algorithmicSurgeActive,
});

