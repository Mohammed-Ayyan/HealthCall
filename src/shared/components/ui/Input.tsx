import React from "react";
import { cn } from "@/shared/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#334139]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-[#627267] pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          suppressHydrationWarning
          className={cn(
            "w-full rounded-xl bg-white border border-[#d8e2d6] px-3.5 py-2 text-sm text-[#142019] placeholder:text-[#94a390] shadow-2xs",
            "focus:outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10 transition-all duration-200",
            icon && "pl-9",
            error && "border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/10",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[#dc2626] font-medium">{error}</p>}
    </div>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { label: string; value: string }[];
  error?: string;
  children?: React.ReactNode;
}

export function Select({
  label,
  options,
  error,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#334139]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-xl bg-white border border-[#d8e2d6] px-3.5 py-2 text-sm text-[#142019] shadow-2xs",
          "focus:outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10 transition-all duration-200 cursor-pointer",
          error && "border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/10",
          className
        )}
        {...props}
      >
        {children
          ? children
          : options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#142019]">
                {opt.label}
              </option>
            ))}
      </select>
      {error && <p className="text-xs text-[#dc2626] font-medium">{error}</p>}
    </div>
  );
}
