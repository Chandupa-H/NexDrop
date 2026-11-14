"use client";

import { useCallback, useEffect, useState } from "react";
import { mapCustomerParcelListItem } from "../api/customer.mappers";
import { fetchCustomerParcelsAction } from "../actions/parcels";
import type { CustomerParcelListItem, CustomerTableFilter } from "../types";

export function useCustomerParcels(
  filter: CustomerTableFilter,
  initialParcels: CustomerParcelListItem[],
  initialTotal: number
) {
  const [remoteData, setRemoteData] = useState<{
    parcels: CustomerParcelListItem[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const refetch = useCallback(() => {
    setRequestVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (filter === "all" && requestVersion === 0) {
      return;
    }

    const controller = new AbortController();
    fetchCustomerParcelsAction(filter)
      .then((res) => {
        if (controller.signal.aborted) return;
        setRemoteData({
          parcels: res.items.map(mapCustomerParcelListItem),
          total: res.total,
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load customer deliveries. Please try again."
        );
      });

    return () => controller.abort();
  }, [filter, requestVersion]);

  const isInitial = filter === "all" && requestVersion === 0;
  const parcels = isInitial ? initialParcels : remoteData?.parcels ?? initialParcels;
  const total = isInitial ? initialTotal : remoteData?.total ?? initialTotal;

  return { parcels, total, loading, error, refetch };
}
