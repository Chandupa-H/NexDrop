import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Top greeting + promo skeleton */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-52" />
          </div>
        </div>
        <Skeleton className="h-20 w-72 rounded-2xl" />
      </div>

      {/* KPI 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      </div>

      {/* Table and quick book row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
