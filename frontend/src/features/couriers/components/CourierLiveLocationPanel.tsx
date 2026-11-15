"use client";

import dynamic from "next/dynamic";
import { LocateFixed, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourierLiveLocation } from "../hooks/useCourierLiveLocation";

const CourierLiveMap = dynamic(
  () => import("./CourierLiveMap").then((module) => module.CourierLiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-36 items-center justify-center bg-slate-50 text-xs text-slate-500 xl:h-48">
        Loading map...
      </div>
    ),
  }
);

export function CourierLiveLocationPanel() {
  const {
    trackingStatus,
    socketStatus,
    location,
    error,
    syncError,
    startTracking,
    stopTracking,
  } = useCourierLiveLocation();
  const isTracking = trackingStatus === "tracking" || trackingStatus === "requesting";

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#e4eee7] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(16,42,29,0.45)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0f2a1d]">Live location</h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
            <Radio
              aria-hidden="true"
              size={13}
              className={
                socketStatus === "connected"
                  ? "text-emerald-600"
                  : socketStatus === "error"
                    ? "text-red-600"
                    : "text-slate-400"
              }
            />
            {socketStatus === "connected" ? "Connected" : socketStatus}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isTracking ? "outline" : "primary"}
          onClick={isTracking ? stopTracking : startTracking}
          aria-pressed={isTracking}
        >
          <LocateFixed aria-hidden="true" size={15} />
          {trackingStatus === "requesting"
            ? "Requesting..."
            : isTracking
              ? "Stop sharing"
              : "Share location"}
        </Button>
      </div>

      {location ? (
        <div className="h-36 min-h-36 flex-1 overflow-hidden rounded-xl border border-slate-200 xl:h-48 xl:min-h-48 2xl:min-h-[180px]">
          <CourierLiveMap latitude={location.lat} longitude={location.lng} />
        </div>
      ) : (
        <div className="flex min-h-16 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm text-slate-500">
          <LocateFixed aria-hidden="true" size={16} className="shrink-0" />
          <span>Location sharing is off</span>
        </div>
      )}

      {(error || syncError) && (
        <p role="status" className="mt-2 text-xs text-red-700">
          {error ?? syncError}
        </p>
      )}
    </section>
  );
}
