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
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variantStyles = {
      primary:
        "bg-[#064E3B] text-white hover:bg-[#085a44] focus:ring-[#064E3B] shadow-sm",
      secondary:
        "bg-white text-[#064E3B] border border-[#16A34A] hover:bg-[#F0FDF4] focus:ring-[#16A34A] shadow-sm",
      outline:
        "border border-[#E5E7EB] bg-white text-[#1F2937] hover:bg-[#F1F5F1] focus:ring-[#064E3B]",
      ghost:
        "text-[#1F2937] hover:bg-[#E2E8F0] focus:ring-[#16A34A]",
      lime:
        "bg-[#A3E635] text-[#064E3B] font-semibold hover:bg-[#92cf2e] focus:ring-[#A3E635] shadow-sm",
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
