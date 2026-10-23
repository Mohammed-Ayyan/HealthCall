import React from "react";
import { cn } from "@/shared/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "purple" | "critical" | "subtle" | "amber";
  glow?: boolean;
}

export function Card({
  children,
  className,
  variant = "default",
  glow = false,
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-white border border-[#e2e8df] text-[#142019] shadow-[0_1px_3px_0_rgba(20,32,25,0.05)]",
    elevated:
      "bg-white border border-[#d6ded4] text-[#142019] shadow-[0_4px_12px_rgba(20,32,25,0.06)]",
    purple:
      "bg-white border border-[#ccfbf1] text-[#142019] shadow-[0_4px_12px_rgba(13,148,136,0.06)]",
    amber:
      "bg-[#fffdf5] border border-[#fde68a] text-[#142019] shadow-[0_2px_8px_rgba(217,119,6,0.06)]",
    critical:
      "bg-[#fff8f8] border border-[#fecaca] text-[#142019] shadow-[0_2px_8px_rgba(220,38,38,0.06)]",
    subtle: "bg-[#fbfcfb] border border-[#e8eee6] text-[#142019]",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-all duration-200",
        variantStyles[variant],
        glow && "hover:border-[#059669] hover:shadow-[0_8px_20px_-4px_rgba(5,150,105,0.1)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between pb-3.5 border-b border-[#edf2ea]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-bold tracking-tight text-[#142019]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-[#627267] mt-1", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  );
}
