import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error" | "neutral";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
  hideIcon?: boolean;
  icon?: React.ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  { bg: string; border: string; titleColor: string; textColor: string }
> = {
  info: {
    bg: "bg-[#F0FDF4]", // Subtle mint/green-grey matching theme
    border: "border-[#D1FAE5]",
    titleColor: "text-[#064E3B]",
    textColor: "text-[#374151]",
  },
  success: {
    bg: "bg-[#F0FDF4]",
    border: "border-[#86EFAC]",
    titleColor: "text-[#064E3B]",
    textColor: "text-[#15803D]",
  },
  warning: {
    bg: "bg-[#F8FAF8]", // Light green-grey container
    border: "border-[#E5E7EB]",
    titleColor: "text-[#064E3B]",
    textColor: "text-[#4B5563]",
  },
  neutral: {
    bg: "bg-[#F8FAF8]",
    border: "border-[#E5E7EB]",
    titleColor: "text-[#064E3B]",
    textColor: "text-[#4B5563]",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    titleColor: "text-[#991B1B]",
    textColor: "text-[#DC2626]",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
  hideIcon = true, // Default to removing harsh unicode icons (ℹ, ⚠) as per theme
  icon,
}: AlertProps) {
  const cfg = variantConfig[variant];
  const renderedIcon = hideIcon ? null : icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 p-4 rounded-xl border text-sm transition-colors",
        cfg.bg,
        cfg.border,
        className
      )}
    >
      {renderedIcon && (
        <span className={cn("flex-shrink-0 font-bold text-base leading-5", cfg.titleColor)}>
          {renderedIcon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-semibold mb-1 text-sm tracking-tight", cfg.titleColor)}>{title}</p>
        )}
        <div className={cn("leading-relaxed", cfg.textColor)}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn("flex-shrink-0 leading-none font-bold text-lg", cfg.titleColor, "hover:opacity-70 cursor-pointer")}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
