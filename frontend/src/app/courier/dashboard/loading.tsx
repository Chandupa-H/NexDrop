import { Skeleton } from "@/components/ui/skeleton";

export default function CourierDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <Skeleton className="h-20 w-64 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="h-80 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="h-96 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-4" />
      </div>
    </div>
  );
}
