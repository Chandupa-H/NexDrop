import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}

const variantConfig: Record<
  AlertVariant,
  { bg: string; border: string; icon: string; titleColor: string; textColor: string }
> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "ℹ",
    titleColor: "text-blue-800",
    textColor: "text-blue-700",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "✓",
    titleColor: "text-green-800",
    textColor: "text-green-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "⚠",
    titleColor: "text-amber-800",
    textColor: "text-amber-700",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "✕",
    titleColor: "text-red-800",
    textColor: "text-red-700",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
}: AlertProps) {
  const cfg = variantConfig[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 p-4 rounded-xl border text-sm",
        cfg.bg,
        cfg.border,
        className
      )}
    >
      <span className={cn("flex-shrink-0 font-bold text-base leading-5", cfg.titleColor)}>
        {cfg.icon}
      </span>
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-semibold mb-0.5", cfg.titleColor)}>{title}</p>
        )}
        <div className={cn(cfg.textColor)}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn("flex-shrink-0 leading-none font-bold text-lg", cfg.titleColor, "hover:opacity-70")}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
