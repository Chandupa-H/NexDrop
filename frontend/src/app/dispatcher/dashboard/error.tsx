"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DispatcherDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dispatcher dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2">Can&apos;t reach the dispatcher service</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        We&apos;re having trouble loading your dispatcher dashboard. Please check your connection and try again.
      </p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}

