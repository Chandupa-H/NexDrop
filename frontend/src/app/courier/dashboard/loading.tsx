/**
 * Loading skeleton state for Courier Dashboard.
 * Matches the layout structure: Greeting -> 4 KPIs -> 2 Charts -> Table & Route.
 */
export default function CourierDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading courier dashboard">
      {/* Greeting Banner Skeleton */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="h-14 w-14 rounded-full bg-[#E5EEE8]" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-[#E5EEE8] rounded" />
            <div className="h-7 w-48 bg-[#E5EEE8] rounded" />
            <div className="h-3 w-64 bg-[#E5EEE8] rounded" />
          </div>
        </div>
        <div className="w-full lg:w-80 h-24 rounded-2xl bg-[#E5EEE8]" />
      </div>

      {/* 4 KPI Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ct-card h-32 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-[#E5EEE8] rounded" />
                <div className="h-8 w-16 bg-[#E5EEE8] rounded" />
              </div>
              <div className="h-11 w-11 rounded-xl bg-[#E5EEE8]" />
            </div>
            <div className="h-3 w-28 bg-[#E5EEE8] rounded" />
          </div>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 ct-card h-[340px] bg-[#E5EEE8]/50" />
        <div className="lg:col-span-4 ct-card h-[340px] bg-[#E5EEE8]/50" />
      </div>

      {/* Table & Route Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 ct-card h-[380px] bg-[#E5EEE8]/50" />
        <div className="lg:col-span-4 ct-card h-[380px] bg-[#E5EEE8]/50" />
      </div>
    </div>
  );
}
