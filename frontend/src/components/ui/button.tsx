import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "lime";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variantStyles = {
      primary:
        "bg-[#064E3B] text-white hover:bg-[#085a44] shadow-sm",
      secondary:
        "bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm",
      outline:
        "border border-[#E5E7EB] bg-white text-[#1F2937] hover:bg-[#F1F5F1]",
      ghost:
        "text-[#1F2937] hover:bg-[#E2E8F0]",
      lime:
        "bg-[#A3E635] text-[#064E3B] font-semibold hover:bg-[#92cf2e] shadow-sm",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
