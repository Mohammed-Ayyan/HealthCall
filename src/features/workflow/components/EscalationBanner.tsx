import React from "react";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, ArrowRight, UserCheck } from "lucide-react";
import { ActionItem } from "@/shared/types/action";
import { Button } from "@/shared/components/ui/Button";

export interface EscalationBannerProps {
  escalatedTasks: ActionItem[];
  onAcknowledge?: (taskId: string) => void;
  className?: string;
}

export function EscalationBanner({
  escalatedTasks,
  onAcknowledge,
  className,
}: EscalationBannerProps) {
  if (escalatedTasks.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 bg-red-50/80 border border-red-200/90 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700 animate-pulse">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">
                Manager Escalation Watchlist ({escalatedTasks.length})
              </h3>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                Action Required
              </span>
            </div>
            <p className="text-xs text-red-700/80">
              Tasks overdue or flagged by AI for compliance breach risk.
            </p>
          </div>
        </div>

        <Link href="/actions">
          <Button variant="danger" size="sm" className="gap-1.5 text-xs">
            <span>Review Escalations</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-red-200/60">
        {escalatedTasks.slice(0, 2).map((t) => (
          <div
            key={t.id}
            className="p-2.5 rounded-xl bg-white border border-red-200 text-xs flex items-center justify-between gap-2 shadow-xs"
          >
            <div>
              <p className="font-bold text-stone-900 truncate max-w-xs">{t.task}</p>
              <p className="text-[11px] text-red-600">
                Patient: {t.patientName} • {t.escalationReason || "SLA Window Critical"}
              </p>
            </div>
            <span className="text-[10px] font-mono text-red-700 font-bold whitespace-nowrap">
              {t.sla.remainingHours.toFixed(1)}h left
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
