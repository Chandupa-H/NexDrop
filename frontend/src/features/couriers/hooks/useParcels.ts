"use client";

import { useCallback, useEffect, useState } from "react";
import { mapParcelListItem } from "../api/courier.mappers";
import { fetchParcelsAction } from "../actions/parcels";
import { sortCourierParcelsByStatus } from "../lib/status";
import { COURIER_PARCEL_PAGE_SIZE } from "../types";
import type { ParcelListItem, TableFilter } from "../types";

interface ParcelsState {
  parcels: ParcelListItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useParcels(
  filter: TableFilter,
  page: number,
  initialParcels: ParcelListItem[],
  initialTotal: number
) {
  const [state, setState] = useState<ParcelsState>({
    parcels: sortCourierParcelsByStatus(initialParcels),
    total: initialTotal,
    loading: false,
    error: null,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  const refetch = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (filter === "all" && page === 1 && requestVersion === 0) {
      queueMicrotask(() => {
        setState({
          parcels: sortCourierParcelsByStatus(initialParcels),
          total: initialTotal,
          loading: false,
          error: null,
        });
      });
      return;
    }

    const controller = new AbortController();

    queueMicrotask(() => {
      setState((current) => ({ ...current, loading: true, error: null }));
    });

    fetchParcelsAction(filter, page, COURIER_PARCEL_PAGE_SIZE)
      .then((response) => {
        if (controller.signal.aborted) return;
        const sortedParcels = sortCourierParcelsByStatus(
          response.items.map(mapParcelListItem)
        );

        setState({
          parcels: sortedParcels,
          total: response.total,
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load parcels",
        }));
      });

    return () => {
      controller.abort();
    };
  }, [filter, page, initialParcels, initialTotal, requestVersion]);

  return {
    parcels: state.parcels,
    total: state.total,
    loading: state.loading,
    error: state.error,
    refetch,
    pageSize: COURIER_PARCEL_PAGE_SIZE,
  };
}
