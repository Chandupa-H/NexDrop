"use client";

import { useEffect, useState } from "react";
import {
  getAssignedParcels,
  getCourierAccountProfile,
  getDashboardSummary,
} from "../api/courier.api";
import { mapCourierProfile, mapDashboardSummary, mapParcelListItem, computeDonutSegments } from "../api/courier.mappers";
import { getGreeting, getTodayDateInTimeZone } from "@/lib/dashboard/format";
import { DashboardView } from "./DashboardView";
import { COURIER_PARCEL_PAGE_SIZE } from "../types";
import { Button } from "@/components/ui/button";

type DashboardDataState = {
  userName: string;
  summary: ReturnType<typeof mapDashboardSummary>;
  parcels: ReturnType<typeof mapParcelListItem>[];
  parcelsTotal: number;
  donutSegments: ReturnType<typeof computeDonutSegments>;
};

function withDashboardContext<T>(
  request: Promise<T>,
  requestName: string
): Promise<T> {
  return request.catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown backend error";
    throw new Error(`Dashboard ${requestName} request failed: ${message}`);
  });
}

async function fetchDashboardData(): Promise<DashboardDataState> {
  const [profileDto, summaryDto, parcelsDto] = await Promise.all([
    withDashboardContext(getCourierAccountProfile(), "profile"),
    withDashboardContext(getDashboardSummary(), "summary"),
    withDashboardContext(
      getAssignedParcels({ limit: COURIER_PARCEL_PAGE_SIZE }),
      "assigned parcels"
    ),
  ]);
  const profile = mapCourierProfile(profileDto);
  const summary = mapDashboardSummary(summaryDto, getTodayDateInTimeZone());

  return {
    userName: profile.fullName,
    summary,
    parcels: parcelsDto.items.map(mapParcelListItem),
    parcelsTotal: parcelsDto.total,
    donutSegments: computeDonutSegments(summary.totals),
  };
}

/**
 * Loads courier dashboard data through the same shared API client as other roles.
 */
export function DashboardData() {
  const [dashboard, setDashboard] = useState<DashboardDataState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then((data) => {
        if (active) {
          setDashboard(data);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load courier dashboard data."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryCount]);

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center" role="status">
        <p className="text-sm text-muted-foreground">Loading courier dashboard...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div
        className="flex min-h-96 flex-col items-center justify-center gap-3 text-center"
        role="alert"
      >
        <p className="text-sm text-destructive">
          {error ?? "Courier dashboard data is unavailable."}
        </p>
        <Button
          onClick={() => {
            setIsLoading(true);
            setError(null);
            setRetryCount((count) => count + 1);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <DashboardView
      greeting={getGreeting()}
      userName={dashboard.userName}
      summary={dashboard.summary}
      parcels={dashboard.parcels}
      parcelsTotal={dashboard.parcelsTotal}
      donutSegments={dashboard.donutSegments}
    />
  );
}
