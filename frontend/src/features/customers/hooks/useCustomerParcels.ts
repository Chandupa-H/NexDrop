"use client";

import { useCallback, useEffect, useState } from "react";
import { mapCustomerParcelListItem } from "../api/customer.mappers";
import { fetchCustomerParcelsAction } from "../actions/parcels";
import type { CustomerParcelListItem, CustomerTableFilter } from "../types";

export function useCustomerParcels(
  filter: CustomerTableFilter,
  initialParcels: CustomerParcelListItem[],
  initialTotal: number,
  { page = 1, fetchOnMount = false, allowMockFallback = true } = {}
) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    parcels: CustomerParcelListItem[];
    total: number;
    error: string | null;
  } | null>(null);
  const key = `${filter}:${page}:${requestVersion}:${allowMockFallback}`;
  const isInitial = !fetchOnMount && filter === "all" && page === 1 && requestVersion === 0;
  const refetch = useCallback(() => setRequestVersion((v) => v + 1), []);

  useEffect(() => {
    if (isInitial) return;
    // Server actions cannot be aborted here. Ignore responses after cleanup instead.
    let active = true;
    fetchCustomerParcelsAction(filter, page, allowMockFallback)
      .then((res) => {
        if (!active) return;
        setResult({ key, parcels: res.items.map(mapCustomerParcelListItem), total: res.total, error: null });
      })
      .catch(() => {
        if (!active) return;
        setResult({ key, parcels: [], total: 0, error: "Unable to load customer deliveries. Please try again." });
      });
    return () => { active = false; };
  }, [filter, page, allowMockFallback, key, isInitial]);

  const current = result?.key === key ? result : null;
  return {
    parcels: isInitial ? initialParcels : current?.parcels ?? [],
    total: isInitial ? initialTotal : current?.total ?? 0,
    loading: !isInitial && current === null,
    error: isInitial ? null : current?.error ?? null,
    refetch,
  };
}
