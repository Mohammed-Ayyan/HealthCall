import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Card } from "@/shared/components/ui/Card";

export interface StatCardProps {
  title: string;
  value: string | number;
  changePercent?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "cyan" | "purple" | "rose" | "emerald" | "amber" | "default" | "teal";
  className?: string;
}

export function StatCard({
  title,
  value,
  changePercent,
  subtitle,
  icon,
  variant = "cyan",
  className,
}: StatCardProps) {
  const isPositive = changePercent !== undefined && changePercent > 0;
  const isNegative = changePercent !== undefined && changePercent < 0;

  const cardBorderStyles = {
    cyan: "border-[#e2e8df] hover:border-[#0d9488]/40 hover:shadow-sm",
    teal: "border-[#e2e8df] hover:border-[#0d9488]/40 hover:shadow-sm",
    purple: "border-[#e2e8df] hover:border-[#1b4332]/40 hover:shadow-sm",
    rose: "border-[#e2e8df] hover:border-[#dc2626]/40 hover:shadow-sm",
    amber: "border-[#e2e8df] hover:border-[#d97706]/40 hover:shadow-sm",
    emerald: "border-[#e2e8df] hover:border-[#059669]/40 hover:shadow-sm",
    default: "border-[#e2e8df] hover:border-[#1b4332]/30 hover:shadow-sm",
  };

  const iconBgStyles = {
    cyan: "bg-[#ccfbf1] text-[#0d9488]",
    teal: "bg-[#ccfbf1] text-[#0d9488]",
    purple: "bg-[#e8f3ec] text-[#1b4332]",
    rose: "bg-[#fee2e2] text-[#dc2626]",
    amber: "bg-[#fef3c7] text-[#d97706]",
    emerald: "bg-[#e8f3ec] text-[#059669]",
    default: "bg-[#f4f7f4] text-[#28382e]",
  };

  return (
    <Card
      className={cn(
        "bg-white relative overflow-hidden transition-all duration-300 group cursor-default shadow-xs p-5",
        cardBorderStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#627267] tracking-wider uppercase">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-[#142019] font-mono">{value}</h3>
          </div>
        </div>

        {icon && (
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
              iconBgStyles[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {changePercent !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-bold font-mono px-1.5 py-0.5 rounded text-[11px]",
              isPositive && "bg-[#dcfce7] text-[#166534]",
              isNegative && "bg-[#fee2e2] text-[#991b1b]",
              !isPositive && !isNegative && "bg-[#f4f7f4] text-[#627267]"
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
            {Math.abs(changePercent)}%
          </span>
        )}
        <span className="text-[#627267]">{subtitle || "vs last 24h"}</span>
      </div>

      {/* Subtle bottom botanical accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity",
          variant === "cyan" && "bg-[#0d9488]",
          variant === "purple" && "bg-[#1b4332]",
          variant === "rose" && "bg-[#dc2626]",
          variant === "amber" && "bg-[#d97706]",
          variant === "emerald" && "bg-[#059669]",
          variant === "default" && "bg-[#1b4332]"
        )}
      />
    </Card>
  );
}
