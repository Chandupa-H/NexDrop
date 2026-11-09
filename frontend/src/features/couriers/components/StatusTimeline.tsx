import { CheckCircle2 } from "lucide-react";
import { getStatusLabel } from "../lib/status";
import type { StatusHistoryEntryDTO } from "../api/courier.dto";

export function StatusTimeline({
  entries,
}: {
  entries: StatusHistoryEntryDTO[];
}) {
  const sortedEntries = [...entries].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );

  if (sortedEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status history is available for this delivery.
      </p>
    );
  }

  return (
    <ol aria-label="Delivery status timeline" className="space-y-0">
      {sortedEntries.map((entry, index) => (
        <li key={`${entry.status}-${entry.timestamp}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center" aria-hidden="true">
            <CheckCircle2 className="size-5 shrink-0 text-brand-green" />
            {index < sortedEntries.length - 1 && (
              <span className="my-1 min-h-6 w-px flex-1 bg-border" />
            )}
          </div>
          <div className={index === sortedEntries.length - 1 ? "pb-0" : "pb-4"}>
            <p className="font-medium">{getStatusLabel(entry.status)}</p>
            <time
              className="text-xs text-muted-foreground"
              dateTime={entry.timestamp}
            >
              {new Intl.DateTimeFormat("en-LK", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Colombo",
              }).format(new Date(entry.timestamp))}
            </time>
            {entry.note && (
              <p className="mt-1 break-words text-sm text-muted-foreground">{entry.note}</p>
            )}
            {entry.proof_reference && (
              <p className="mt-1 break-all text-xs text-muted-foreground">
                Proof reference: {entry.proof_reference}
              </p>
            )}
            {entry.actor && (
              <p className="mt-1 text-xs text-muted-foreground">By {entry.actor}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
