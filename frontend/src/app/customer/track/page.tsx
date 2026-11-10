import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard";
import { TrackParcelView } from "@/features/customers/components/TrackParcelView";

export const metadata = {
  title: "Track Parcel - NexDrop Customer",
  description: "Track your NexDrop courier parcel in real time with live status updates and milestone history.",
};

export default function CustomerTrackPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Track Parcel"
        subtitle="Real-time shipment milestones, delivery progress, and scan activity timeline"
      />

      <Suspense
        fallback={
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-14 w-full bg-gray-100 rounded-xl" />
            <div className="h-64 w-full bg-gray-100 rounded-2xl mt-6" />
          </div>
        }
      >
        <TrackParcelView />
      </Suspense>
    </div>
  );
}
