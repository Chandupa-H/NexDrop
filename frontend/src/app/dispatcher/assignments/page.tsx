import { WelcomeHeader } from "@/components/dashboard";
import { DispatchConsole } from "@/features/dispatcher/components/DispatchConsole";

export const metadata = {
  title: "Dispatch Console | NexDrop",
  description: "Manage courier assignments, fleet workloads, and warehouse routing.",
};

export default function DispatcherAssignmentsPage() {
  return (
    <div className="space-y-6">
      <WelcomeHeader
        greeting="Operational Dispatch"
        name="Fleet Control Console"
        subtitle="Execute courier assignments, dynamic reassignments, fleet workload management, and warehouse hub routing."
      />
      <DispatchConsole />
    </div>
  );
}
