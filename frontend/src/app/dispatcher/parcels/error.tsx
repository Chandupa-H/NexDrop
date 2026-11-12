"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function UnassignedParcelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unassigned parcels error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-[var(--dashboard-text)]">
        Can&apos;t reach the dispatch service
      </h2>
      <p className="text-sm text-[var(--dashboard-muted)] mb-6 max-w-md">
        We&apos;re having trouble loading unassigned parcels from the dispatch queue. Please check your connection and try again.
      </p>
      <Button onClick={reset} className="inline-flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Retry
      </Button>
    </div>
  );
}

