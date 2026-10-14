"use client";

import { useState, useEffect } from "react";
import apiClient, { HealthStatus } from "@/lib/api-client";

export function useBackendHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
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
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return { health, isHealthy, isLoading, error, refetch: checkStatus };
}
