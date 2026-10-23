import React from "react";
import { Clock, AlertTriangle, ArrowRight, UserPlus, CheckCircle2, Flame, ShieldAlert } from "lucide-react";
import { ActionItem, TaskStatus } from "@/shared/types/action";
import { Badge } from "@/shared/components/ui/Badge";
import { PriorityBadge } from "@/features/ai-intelligence/components/PriorityBadge";
import { getDepartmentColorClass } from "@/shared/utils/formatters";
import { cn } from "@/shared/utils/cn";

export interface TaskCardProps {
  task: ActionItem;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onEscalate?: (task: ActionItem) => void;
  onAssign?: (task: ActionItem) => void;
}

export function TaskCard({
  task,
  onStatusChange,
  onEscalate,
  onAssign,
}: TaskCardProps) {
  const isUrgentSLA = task.sla.isWarning || task.sla.isBreached || task.sla.remainingHours < 2;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 bg-white border transition-all duration-200 space-y-3 shadow-xs select-none group",
        task.isEscalated
          ? "border-red-300 bg-red-50/40 shadow-xs"
          : isUrgentSLA
          ? "border-amber-300 bg-amber-50/40"
          : "border-[#e2e8e0] hover:border-[#059669]/50 hover:shadow-sm"
      )}
    >
      {/* Top Header: Department & Priority */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getDepartmentColorClass(
            task.department
          )}`}
        >
          {task.department}
        </span>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>

      {/* Task Title & Description */}
      <div>
        <h4 className="text-xs font-bold text-[#142019] group-hover:text-[#059669] transition-colors line-clamp-2">
          {task.task}
        </h4>
        <p className="text-[11px] text-[#607264] mt-1 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      </div>

      {/* Patient info */}
      <div className="flex items-center justify-between text-[11px] text-[#607264] pt-1 border-t border-[#edf2ec] font-mono">
        <span>Patient: <strong className="text-[#142019] font-sans">{task.patientName}</strong></span>
        <span className="text-[#8fa394]">{task.patientMrn}</span>
      </div>

      {/* SLA Countdown pill */}
      <div
        className={cn(
          "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-mono",
          task.sla.isBreached
            ? "bg-red-50 text-red-700 border border-red-200"
            : isUrgentSLA
            ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
            : "bg-[#f7f9f6] text-[#059669] border border-[#e2e8e0]"
        )}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>SLA Remaining:</span>
        </span>
        <span className="font-bold">
          {task.sla.remainingHours > 0
            ? `${task.sla.remainingHours.toFixed(1)} hrs`
            : "BREACHED"}
        </span>
      </div>

      {/* Escalation Tag if applicable */}
      {task.isEscalated && (
        <div className="p-2 rounded-lg bg-red-100/70 border border-red-200 text-[10px] text-red-800 flex items-center gap-1.5 font-medium">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Escalated to {task.escalatedTo || "Manager"}</span>
        </div>
      )}

      {/* Assignee & Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[#edf2ec]">
        {task.assignedTo ? (
          <div className="flex items-center gap-2">
            <img
              src={task.assignedTo.avatar}
              alt={task.assignedTo.name}
              className="h-6 w-6 rounded-full object-cover border border-[#c8e6c9]"
            />
            <span className="text-[11px] text-[#142019] font-medium truncate max-w-[100px]">
              {task.assignedTo.name}
            </span>
          </div>
        ) : (
          <button
            onClick={() => onAssign && onAssign(task)}
            className="flex items-center gap-1 text-[11px] text-[#059669] hover:text-[#047857] font-semibold cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Assign Staff</span>
          </button>
        )}

        {/* Status Quick Advance or Escalate */}
        <div className="flex items-center gap-1">
          {!task.isEscalated && task.status !== "completed" && onEscalate && (
            <button
              onClick={() => onEscalate(task)}
              title="Escalate task to manager"
              className="px-2 py-1 rounded bg-white hover:bg-red-50 text-[#607264] hover:text-red-700 text-[10px] font-bold border border-[#e2e8e0] hover:border-red-200 transition-colors cursor-pointer"
            >
              Escalate
            </button>
          )}

          {task.status !== "completed" && onStatusChange && (
            <button
              onClick={() => {
                const nextStatus: TaskStatus =
                  task.status === "pending"
                    ? "assigned"
                    : task.status === "assigned"
                    ? "in-progress"
                    : "completed";
                onStatusChange(task.id, nextStatus);
              }}
              title="Advance to next workflow stage"
              className="px-2 py-1 rounded bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b4332] text-[10px] font-bold border border-[#c8e6c9] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Advance</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
