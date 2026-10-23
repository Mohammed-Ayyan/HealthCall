import React from "react";
import { cn } from "@/shared/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "cyan"
    | "purple"
    | "rose"
    | "amber"
    | "emerald"
    | "outline"
    | "biolum"
    | "teal"
    | "green"
    | "red"
    | "gray";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  children,
  className,
  variant = "default",
  size = "md",
  dot = false,
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-[#f0f4ef] text-[#425247] border-[#d8e2d6]",
    gray: "bg-[#f0f4ef] text-[#425247] border-[#d8e2d6]",
    biolum: "bg-[#eaf7ee] text-[#059669] border-[#bbf0c8] shadow-[0_1px_2px_rgba(5,150,105,0.06)]",
    emerald: "bg-[#eaf7ee] text-[#059669] border-[#bbf0c8]",
    green: "bg-[#eaf7ee] text-[#059669] border-[#bbf0c8]",
    cyan: "bg-[#e6fffa] text-[#0d9488] border-[#99f6e4] shadow-[0_1px_2px_rgba(13,148,136,0.06)]",
    teal: "bg-[#e6fffa] text-[#0d9488] border-[#99f6e4] shadow-[0_1px_2px_rgba(13,148,136,0.06)]",
    amber: "bg-[#fef3c7] text-[#b45309] border-[#fde68a] shadow-[0_1px_2px_rgba(217,119,6,0.06)]",
    rose: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca] shadow-[0_1px_2px_rgba(220,38,38,0.06)]",
    red: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca] shadow-[0_1px_2px_rgba(220,38,38,0.06)]",
    purple: "bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]",
    outline: "bg-transparent text-[#627267] border-[#d8e2d6]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-semibold tracking-wide",
    md: "px-2.5 py-1 text-xs font-semibold tracking-wide",
  };

  const styleKey = variantStyles[variant] ? variant : "default";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border transition-all duration-150 font-medium",
        variantStyles[styleKey],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            (variant === "cyan" || variant === "teal") && "bg-[#0d9488]",
            (variant === "biolum" || variant === "emerald" || variant === "green") && "bg-[#059669]",
            (variant === "rose" || variant === "red") && "bg-[#dc2626]",
            variant === "amber" && "bg-[#d97706]",
            variant === "purple" && "bg-[#7c3aed]",
            (variant === "default" || variant === "gray") && "bg-[#627267]",
            variant === "outline" && "bg-[#9ca3af]"
          )}
        />
      )}
      {children}
    </span>
  );
}
