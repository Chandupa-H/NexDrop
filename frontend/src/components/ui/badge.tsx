import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "success"
  | "lime"
  | "outline"
  | "secondary"
  | "destructive"
  | "created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-[#064E3B] text-white",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    lime: "bg-[#A3E635] text-[#064E3B] font-semibold",
    outline: "border border-[#E5E7EB] text-[#1F2937]",
    secondary: "bg-[#E2E8F0] text-[#1F2937]",
    destructive: "bg-rose-50 text-rose-700 border border-rose-200",
    // Status badges matching theme specs
    created: "bg-slate-100 text-slate-700 border border-slate-300",
    in_transit: "bg-amber-50 text-amber-800 border border-amber-300",
    out_for_delivery: "bg-sky-50 text-sky-800 border border-sky-300",
    delivered: "bg-emerald-50 text-emerald-800 border border-emerald-300",
    failed: "bg-rose-50 text-rose-700 border border-rose-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
