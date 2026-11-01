import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#1F2937]"
          >
            {label}
            {props.required && (
              <span className="text-[#DC2626] ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3 py-2.5 text-sm rounded-lg border bg-white text-[#1F2937]",
            "placeholder:text-[#64748B]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#E2E8F0]",
            error
              ? "border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]"
              : "border-[#E5E7EB] hover:border-[#064E3B]/40",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-[#DC2626] flex items-center gap-1">
            <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-[#64748B]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
