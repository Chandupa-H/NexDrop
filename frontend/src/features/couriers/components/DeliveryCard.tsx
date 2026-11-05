"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, Package, Weight } from "lucide-react";
import { StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStatusLabel, getStatusTone } from "../lib/status";
import type { DeliveryListItemDTO } from "../api/courier.dto";

export function DeliveryCard({ delivery }: { delivery: DeliveryListItemDTO }) {
  const router = useRouter();

  return (
    <Card className="flex h-full min-w-0 flex-col gap-3.5 border-border/80 p-4 shadow-sm">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tracking number
          </p>
          <h2 className="break-all text-sm font-semibold text-foreground">
            {delivery.tracking_number}
          </h2>
        </div>
        <StatusBadge
          label={getStatusLabel(delivery.status)}
          tone={getStatusTone(delivery.status)}
        />
      </div>

      <div className="flex min-w-0 gap-2.5">
        <div className="flex shrink-0 flex-col items-center pt-0.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-brand-green" />
          <span className="my-1 min-h-5 w-px flex-1 border-l border-dashed border-border" />
          <ArrowDown className="size-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <AddressRow label="Pickup" address={delivery.pickup_address} />
          <AddressRow label="Drop-off" address={delivery.dropoff_address} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-2.5 text-sm">
        <div className="flex min-w-0 items-center gap-1.5">
          <Package className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="break-words font-medium">{delivery.size || "Size unavailable"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Weight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{delivery.weight} kg</span>
        </div>
      </div>

      <div className="mt-auto flex min-w-0 items-end justify-between gap-3 border-t border-border pt-2.5">
        <div className="min-w-0 text-sm">
          <p className="break-words font-semibold text-foreground">{delivery.recipient_name}</p>
          <a
            href={`tel:${delivery.recipient_phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex min-h-8 max-w-full items-center break-all text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {delivery.recipient_phone}
          </a>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 shrink-0 px-3"
          onClick={() =>
            router.push(
              `/courier/dashboard?tracking_id=${encodeURIComponent(delivery.tracking_number)}`
            )
          }
        >
          View Details <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

function AddressRow({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words text-sm leading-5 text-foreground">
        {address || "Address unavailable"}
      </p>
    </div>
  );
}
