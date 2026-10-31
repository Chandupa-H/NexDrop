/**
 * Dashboard configuration registry.
 * Each team adds their own config import + one registration line.
 */

import { notFound } from "next/navigation";
import type { DashboardRole, DashboardRoleConfig } from "./types";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { dispatcherDashboardConfig } from "@/features/dispatcher/config/dashboard.config";

const ROLE_CONFIGS: Partial<Record<DashboardRole, DashboardRoleConfig>> = {
  courier: courierDashboardConfig,
  dispatcher: dispatcherDashboardConfig,
  // TODO(customer): import and register customer config
  // TODO(merchant): import and register merchant config
  // TODO(admin): import and register admin config
};

export function getDashboardConfig(role: DashboardRole): DashboardRoleConfig {
  const config = ROLE_CONFIGS[role];
  if (!config) {
    notFound();
  }
  return config;
}
