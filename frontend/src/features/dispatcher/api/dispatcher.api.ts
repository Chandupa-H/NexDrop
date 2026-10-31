import { cache } from "react";
import apiClient from "@/lib/api-client";
import type { DispatcherMeDTO, DispatcherStatsDTO } from "./dispatcher.dto";

/**
 * Get authenticated dispatcher profile.
 * Wrapped in React cache() so the layout and page share one request.
 */
export const getDispatcherProfile = cache(async (): Promise<DispatcherMeDTO> => {
  return apiClient.get<DispatcherMeDTO>("/dispatch/dispatcher/me");
});

/**
 * Get dispatcher dashboard metrics (strictly read-only query from backend).
 */
export async function getDispatcherStats(): Promise<DispatcherStatsDTO> {
  return apiClient.get<DispatcherStatsDTO>("/dispatch/dashboard/stats");
}

