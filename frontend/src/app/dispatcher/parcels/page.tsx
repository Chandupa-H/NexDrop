import { Suspense } from "react";
import { UnassignedParcelsData } from "@/features/dispatcher";
import UnassignedParcelsLoading from "./loading";

export const metadata = {
  title: "Unassigned Parcels — Dispatcher | NexDrop",
  description: "Search, filter, and inspect unassigned parcels awaiting courier dispatch.",
};

export default function UnassignedParcelsPage() {
  return (
    <Suspense fallback={<UnassignedParcelsLoading />}>
      <UnassignedParcelsData />
    </Suspense>
  );
}

