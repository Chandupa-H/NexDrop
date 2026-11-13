import apiClient from "@/lib/api-client";
import type {
  AdminPricingRulesDTO,
  AdminPricingRulesUpdateDTO,
  PricingTierDTO,
} from "./pricing.dto";

export const getPricingRules = () =>
  apiClient.get<AdminPricingRulesDTO>("/pricing/rules");

export const updatePricingRules = (payload: AdminPricingRulesUpdateDTO) =>
  apiClient.put<AdminPricingRulesDTO>("/pricing/rules", payload);

export const getPricingTiers = () =>
  apiClient.get<PricingTierDTO[]>("/pricing/tiers");

