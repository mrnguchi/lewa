"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import type { DropdownOption } from "../../types";

// I keep this dropdown custom so the admin UI never falls back to browser select styling.
export function CustomDropdown({
  buttonClassName,
  className,
  disabled = false,
  error,
  label,
  menuClassName,
  onChange,
  options,
  placeholder,
  value,
  wrapSelectedText = false,
}: {
  buttonClassName?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  menuClassName?: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
  value: string;
  wrapSelectedText?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeDropdown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative text-left", className)} ref={dropdownRef}>
      {label && (
        <span className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </span>
      )}
      <button
        aria-expanded={isOpen}
        className={cn(
          "flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-2xl border bg-white px-4 text-left text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-slate-200 focus:border-primary focus:ring-primary/15",
          isOpen && "border-primary ring-2 ring-primary/15",
          buttonClassName,
        )}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span
          className={cn(
            "min-w-0 flex-1",
            wrapSelectedText
              ? "whitespace-normal break-words leading-5"
              : "truncate",
            selectedOption ? "text-text-primary" : "text-slate-400",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "shrink-0 text-text-body transition",
            isOpen && "rotate-180 text-primary",
          )}
          size={16}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-xl bg-white p-1 shadow-[0_18px_46px_rgba(31,41,51,0.16)] ring-1 ring-border-soft",
            menuClassName,
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                className={cn(
                  "flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-primary-light hover:text-primary-dark",
                  isSelected && "bg-primary-light text-primary-dark",
                )}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold leading-5">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="mt-0.5 block break-words text-xs leading-5 text-text-body">
                      {option.description}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
