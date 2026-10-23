import React from "react";
import { AlertCircle, Flame, Clock, CheckCircle } from "lucide-react";
import { CallPriority } from "@/shared/types/call";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/utils/cn";

export interface PriorityBadgeProps {
  priority: CallPriority;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function PriorityBadge({
  priority,
  showIcon = true,
  size = "md",
  className,
}: PriorityBadgeProps) {
  const config = {
    critical: {
      label: "Critical Urgency",
      badgeVariant: "rose" as const,
      icon: <Flame className="h-3.5 w-3.5" />,
      textClass: "text-[#dc2626]",
    },
    high: {
      label: "High Priority",
      badgeVariant: "amber" as const,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      textClass: "text-[#d97706]",
    },
    medium: {
      label: "Medium Priority",
      badgeVariant: "teal" as const,
      icon: <Clock className="h-3.5 w-3.5" />,
      textClass: "text-[#0d9488]",
    },
    low: {
      label: "Standard / Low",
      badgeVariant: "default" as const,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      textClass: "text-[#607264]",
    },
  };

  const current = config[priority];

  return (
    <Badge
      variant={current.badgeVariant}
      size={size}
      dot={priority === "critical" || priority === "high"}
      className={cn("gap-1 font-mono uppercase tracking-wider", className)}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </Badge>
  );
}
