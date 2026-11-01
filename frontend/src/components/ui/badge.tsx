import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "lime" | "outline" | "secondary" | "destructive";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-[#064E3B] text-white",
    success: "bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20",
    lime: "bg-[#A3E635] text-[#064E3B] font-semibold",
    outline: "border border-[#E5E7EB] text-[#1F2937]",
    secondary: "bg-[#E2E8F0] text-[#1F2937]",
    destructive: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
