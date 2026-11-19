import { Skeleton } from "@/components/ui/skeleton";

export default function MerchantDashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-xl w-full" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl w-full" />
    </div>
  );
}

