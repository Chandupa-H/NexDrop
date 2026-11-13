import { Skeleton } from "@/components/ui/skeleton";

export default function UnassignedParcelsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded-md" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>

        {/* Filter / Search Bar Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-11 w-full max-w-md rounded-lg" />
          <Skeleton className="h-11 w-44 rounded-lg" />
        </div>

        {/* Table Skeleton */}
        <div className="rounded-xl border border-[var(--dashboard-border)] overflow-hidden">
          <div className="h-11 bg-[var(--dashboard-surface-subtle)] border-b border-[var(--dashboard-border)] flex items-center px-4 gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="divide-y divide-[var(--dashboard-border)]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 flex items-center px-4 gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <div className="ml-auto">
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--dashboard-border)]">
          <Skeleton className="h-4 w-44 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

