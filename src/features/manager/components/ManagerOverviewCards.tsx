"use client";

import React from "react";
import { Users, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { ManagerOverviewData } from "../types";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface ManagerOverviewCardsProps {
  overview: ManagerOverviewData;
}

export function ManagerOverviewCards({ overview }: ManagerOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* Management Hub Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-md">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  {overview.departmentName}
                </h1>
                <Badge variant="teal" size="sm">
                  Supervised by {overview.managerName}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1">
                Operational Equilibrium & Departmental SLA Oversight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-[#dce8df] text-right shadow-xs">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#627267]">Department Vitality</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
                <span className="text-base font-mono font-bold text-[#1b4332]">
                  {overview.departmentVitalityScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metrics: Employees, Active tasks, Completed tasks, Overdue tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Employees */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <Badge variant="teal" size="sm">CLINICAL TEAM</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Employees Active
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.totalEmployeesCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Front desk, nurses & insurance</p>
          </div>
        </Card>

        {/* Card 2: Active Tasks */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <Badge variant="amber" size="sm">DISPATCHED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Active Tasks
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.activeTasksCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Within standard SLA window</p>
          </div>
        </Card>

        {/* Card 3: Completed Tasks */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <Badge variant="emerald" size="sm">RESOLVED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Completed Tasks
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.completedTasksCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Avg turnaround {overview.avgResolutionHours}h</p>
          </div>
        </Card>

        {/* Card 4: Overdue Tasks */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <Badge variant="rose" size="sm">ACTION NEEDED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Overdue Tasks
            </p>
            <p className="text-xl font-bold text-[#dc2626] mt-1">{overview.overdueTasksCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Escalated to management</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
