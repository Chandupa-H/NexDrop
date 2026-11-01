"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient, { HealthStatus } from "@/lib/api-client";

export function useBackendHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
      setIsHealthy(data.status === "healthy");
      setError(null);
    } catch (err) {
      setIsHealthy(false);
      setError((err as Error).message || "Failed to reach backend");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiClient
      .getHealth()
      .then((data) => {
        if (!active) return;
        setHealth(data);
        setIsHealthy(data.status === "healthy");
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setIsHealthy(false);
        setError((err as Error).message || "Failed to reach backend");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { health, isHealthy, isLoading, error, refetch: checkStatus };
}
