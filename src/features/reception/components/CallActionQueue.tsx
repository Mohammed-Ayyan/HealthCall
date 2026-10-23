"use client";

import React, { useState } from "react";
import { PhoneCall, Bot, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { ReceptionCallAction } from "../types";
import { receptionService } from "../services/receptionService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface CallActionQueueProps {
  initialCallActions: ReceptionCallAction[];
}

export function CallActionQueue({ initialCallActions }: CallActionQueueProps) {
  const [callActions, setCallActions] = useState<ReceptionCallAction[]>(initialCallActions);

  const handleStatusChange = async (id: string, status: ReceptionCallAction["status"]) => {
    await receptionService.updateCallActionStatus(id, status);
    setCallActions(
      callActions.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">CareOps AI Call Action Queue</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Front desk action items extracted autonomously from incoming patient calls
              </p>
            </div>
          </div>
          <Badge variant="teal">Telephony Pipeline Synchronized</Badge>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {callActions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No pending telephony call action items.
          </div>
        ) : (
          callActions.map((task) => (
          <div
            key={task.id}
            className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center flex-shrink-0 mt-0.5">
                <PhoneCall className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm font-bold text-[#142019]">{task.taskTitle}</h4>
                  <Badge
                    variant={
                      task.priority === "high"
                        ? "rose"
                        : task.priority === "medium"
                        ? "amber"
                        : "teal"
                    }
                    size="sm"
                  >
                    {task.priority.toUpperCase()} PRIORITY
                  </Badge>
                  <Badge
                    variant={task.status === "Completed" ? "emerald" : "default"}
                    size="sm"
                  >
                    {task.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#627267] mt-1">
                  <span>Caller: <strong className="text-[#142019]">{task.callerName}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-[#28382e]">{task.callerPhone}</span>
                  <span>•</span>
                  <span className="font-mono text-[#94a399]">Call ID: {task.callId}</span>
                </div>

                {/* AI Summary Extract */}
                <div className="mt-2.5 bg-[#f7f9f6] p-3 rounded-xl border border-[#e2e8df] max-w-2xl text-xs text-[#28382e]">
                  <span className="text-[#059669] font-semibold block mb-0.5">
                    CareOps AI Call Extract:
                  </span>
                  {task.aiSummaryExtract}
                </div>

                {task.assignedDoctorPreference && (
                  <p className="text-[11px] text-[#627267] mt-1.5">
                    Requested Clinician: <span className="text-[#1b4332] font-semibold">{task.assignedDoctorPreference}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Deadline & Actions */}
            <div className="flex flex-col md:items-end justify-between pl-12 md:pl-0 gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#92400e] bg-[#fefce8] px-3 py-1.5 rounded-lg border border-[#fef08a]">
                <Clock className="h-3.5 w-3.5 text-[#d97706]" />
                <span>Deadline: {task.deadline}</span>
              </div>

              {task.status !== "Completed" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange(task.id, "Completed")}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Execute & Resolve</span>
                </Button>
              ) : (
                <span className="text-xs font-mono text-[#059669] bg-[#f0fdf4] px-3 py-1.5 rounded-lg border border-[#bbf7d0]">
                  Action Executed
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
    </Card>
  );
}
