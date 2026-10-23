import React from "react";
import { Clock, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";
import { ActionItem } from "@/shared/types/action";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/utils/cn";

export interface SLATrackerCardProps {
  tasks: ActionItem[];
  className?: string;
}

export function SLATrackerCard({ tasks, className }: SLATrackerCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Operational SLA Tracking Engine</CardTitle>
            <p className="text-[11px] text-[#607264]">
              Real-time countdown deadlines and compliance breach monitors
            </p>
          </div>
        </div>
        <Badge variant="emerald" size="sm">
          97.4% Target Compliance
        </Badge>
      </CardHeader>

      <div className="mt-4 space-y-3">
        {tasks.slice(0, 4).map((task) => {
          const isBreached = task.sla.isBreached;
          const isWarning = task.sla.isWarning || task.sla.remainingHours < 2;

          return (
            <div
              key={task.id}
              className={cn(
                "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors",
                isBreached
                  ? "bg-red-50/80 border-red-200"
                  : isWarning
                  ? "bg-amber-50/80 border-amber-200"
                  : "bg-[#f7f9f6] border-[#e2e8e0]"
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#142019]">{task.task}</span>
                  <Badge variant="outline" size="sm">
                    {task.department}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#607264]">
                  Patient: {task.patientName} • Deadline: <strong className="text-[#142019]">{task.deadline}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <p className="text-[10px] text-[#8fa394] uppercase">Remaining Time</p>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      isBreached ? "text-red-700" : isWarning ? "text-amber-800" : "text-[#059669]"
                    )}
                  >
                    {task.sla.remainingHours > 0
                      ? `${task.sla.remainingHours.toFixed(1)} hours remaining`
                      : "SLA Breached"}
                  </p>
                </div>

                <Badge
                  variant={isBreached ? "rose" : isWarning ? "amber" : "emerald"}
                  size="sm"
                  dot={isWarning || isBreached}
                >
                  {isBreached ? "BREACHED" : isWarning ? "WARNING" : "ON TRACK"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
