"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface ThemedSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface ThemedSelectProps {
  options: ThemedSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  textSize?: string;
}

export function ThemedSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  textSize = "text-xs sm:text-sm",
}: ThemedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button with comfortably inset arrow */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full text-left ${textSize} pl-3.5 pr-10 py-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] ${
          isOpen
            ? "border-[var(--dashboard-primary)] ring-2 ring-[var(--dashboard-primary)]/20 shadow-xs"
            : "border-[var(--dashboard-hairline)] hover:border-[var(--dashboard-primary)]/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        <span className={`truncate block font-normal ${!selectedOption ? "text-[var(--dashboard-muted)]" : ""}`}>
          {selectedOption ? selectedOption.label : placeholder || "Select an option..."}
        </span>

        {/* Chevron icon positioned away from the right edge */}
        <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-[var(--dashboard-muted)]">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[var(--dashboard-primary)]" : ""
            }`}
          />
        </span>
      </button>

      {/* Floating Dropdown Menu matching NexDrop Theme Colors */}
      {isOpen && (
        <div
          className="themed-select-dropdown absolute z-50 left-0 top-full mt-1.5 w-full max-h-80 overflow-y-auto rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] py-1.5 shadow-xl animate-in fade-in duration-150 no-scrollbar"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          role="listbox"
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              .themed-select-dropdown::-webkit-scrollbar {
                display: none !important;
                width: 0px !important;
                height: 0px !important;
                background: transparent !important;
              }
              .themed-select-dropdown::-webkit-scrollbar-thumb {
                display: none !important;
                background: transparent !important;
              }
              .themed-select-dropdown::-webkit-scrollbar-track {
                display: none !important;
                background: transparent !important;
              }
              .themed-select-dropdown {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
            `
          }} />
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-3.5 py-2.5 ${textSize} cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)] font-semibold"
                    : "text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)]/50 hover:text-[var(--dashboard-primary)]"
                }`}
              >
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="text-[11px] text-[var(--dashboard-muted)] font-normal">
                      {opt.description}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 text-[var(--dashboard-primary)] shrink-0 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
