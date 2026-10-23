"use client";

import React from "react";
import { Users, BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { EmployeeWorkload } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface TeamWorkloadManagerProps {
  workloads: EmployeeWorkload[];
}

export function TeamWorkloadManager({ workloads }: TeamWorkloadManagerProps) {
  const getWorkloadBadge = (status: EmployeeWorkload["workloadStatus"]) => {
    switch (status) {
      case "Optimal":
        return <Badge variant="emerald">OPTIMAL</Badge>;
      case "Balanced":
        return <Badge variant="teal">BALANCED</Badge>;
      case "Near Capacity":
        return <Badge variant="amber">NEAR CAPACITY</Badge>;
      case "Overloaded":
        return <Badge variant="rose">OVERLOADED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Team Workload & Performance Matrix</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Real-time task distribution, throughput efficiency, and clinical workload capacity
              </p>
            </div>
          </div>
          <Badge variant="teal">Live Balancing</Badge>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {workloads.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No team members currently registered.
          </div>
        ) : (
          workloads.map((emp) => (
          <div
            key={emp.id}
            className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] border border-[#dce8df] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold font-mono text-xs">
                {emp.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm font-bold text-[#142019]">{emp.name}</h4>
                  <span className="text-xs text-[#627267]">{emp.role}</span>
                  {getWorkloadBadge(emp.workloadStatus)}
                </div>

                <div className="flex items-center gap-4 text-xs text-[#627267] mt-1.5 flex-wrap font-mono">
                  <span className="text-[#28382e]">Active Tasks: <strong className="text-[#142019]">{emp.activeTasks}</strong></span>
                  <span>•</span>
                  <span className="text-[#059669] font-semibold">Completed: {emp.completedToday}</span>
                  <span>•</span>
                  {emp.overdueTasks > 0 ? (
                    <span className="text-[#dc2626] font-semibold">Overdue: {emp.overdueTasks}</span>
                  ) : (
                    <span className="text-[#94a399]">0 Overdue</span>
                  )}
                </div>

                {/* Progress bar visual for workload load */}
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="w-48 h-1.5 rounded-full bg-[#e2e8df] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        emp.workloadStatus === "Overloaded"
                          ? "bg-[#dc2626]"
                          : emp.workloadStatus === "Near Capacity"
                          ? "bg-[#d97706]"
                          : "bg-[#059669]"
                      }`}
                      style={{ width: `${Math.min(emp.activeTasks * 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#627267]">
                    Cap: {emp.activeTasks * 10}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:items-end justify-between pl-12 md:pl-0">
              <div className="bg-[#f7f9f6] px-3.5 py-1.5 rounded-xl border border-[#e2e8df] text-right">
                <span className="text-[11px] text-[#627267] uppercase tracking-wider block font-mono">
                  Efficiency Rating
                </span>
                <span className="text-sm font-mono font-bold text-[#1b4332]">
                  {emp.efficiencyRating}%
                </span>
              </div>
            </div>
          </div>
        ))
      )}
      </div>
    </Card>
  );
}
