import React from "react";
import { cn } from "@/shared/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "purple" | "solar";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  loading = false,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      "bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-semibold shadow-sm hover:shadow active:scale-[0.98]",
    solar:
      "bg-[#d97706] hover:bg-[#b45309] text-white font-semibold shadow-sm active:scale-[0.98]",
    purple:
      "bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold shadow-sm active:scale-[0.98]",
    secondary:
      "bg-[#f0f4ef] hover:bg-[#e4ece2] text-[#142019] border border-[#d8e2d6] active:scale-[0.98]",
    outline:
      "bg-white hover:bg-[#f7f9f6] text-[#334139] border border-[#d8e2d6] hover:border-[#1b4332] active:scale-[0.98] shadow-xs",
    ghost:
      "bg-transparent hover:bg-[#f0f4ef] text-[#425247] hover:text-[#142019] active:scale-[0.98]",
    danger:
      "bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-sm active:scale-[0.98]",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5 font-medium",
    md: "px-4 py-2 text-xs rounded-xl gap-2 font-semibold",
    lg: "px-5 py-2.5 text-sm rounded-xl gap-2.5 font-bold",
    icon: "h-8 w-8 rounded-lg p-0 flex items-center justify-center",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin mr-1.5" />
      ) : null}
      {children}
    </button>
  );
}
