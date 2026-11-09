"use client";

import { useCallback, useEffect, useState } from "react";
import { mapParcelListItem } from "../api/courier.mappers";
import { fetchParcelsAction } from "../actions/parcels";
import type { ParcelListItem, TableFilter } from "../types";

interface ParcelsState {
  parcels: ParcelListItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useParcels(
  filter: TableFilter,
  initialParcels: ParcelListItem[],
  initialTotal: number
) {
  const [state, setState] = useState<ParcelsState>({
    parcels: initialParcels,
    total: initialTotal,
    loading: false,
    error: null,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  const refetch = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (filter === "all" && requestVersion === 0) {
      queueMicrotask(() => {
        setState({
          parcels: initialParcels,
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

    fetchParcelsAction(filter)
      .then((response) => {
        if (controller.signal.aborted) return;
        setState({
          parcels: response.items.map(mapParcelListItem),
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
  }, [filter, initialParcels, initialTotal, requestVersion]);

  return {
    parcels: state.parcels,
    total: state.total,
    loading: state.loading,
    error: state.error,
    refetch,
  };
}
