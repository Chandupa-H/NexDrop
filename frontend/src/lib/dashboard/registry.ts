/**
 * Dashboard configuration registry.
 * Each team adds their own config import + one registration line.
 */

import { notFound } from "next/navigation";
import type { DashboardRole, DashboardRoleConfig } from "./types";
import { courierDashboardConfig } from "@/features/couriers/config/dashboard.config";
import { adminDashboardConfig } from "@/features/admin/config/dashboard.config";
import { dispatcherDashboardConfig } from "@/features/dispatcher/config/dashboard.config";
import { merchantDashboardConfig } from "@/features/merchants/config/dashboard.config";

const ROLE_CONFIGS: Partial<Record<DashboardRole, DashboardRoleConfig>> = {
  courier: courierDashboardConfig,
  admin: adminDashboardConfig,
  dispatcher: dispatcherDashboardConfig,
  merchant: merchantDashboardConfig,
  // TODO(customer): import and register customer config
};

export function getDashboardConfig(role: DashboardRole): DashboardRoleConfig {
  const config = ROLE_CONFIGS[role];
  if (!config) {
    notFound();
  }
  return config;
}
