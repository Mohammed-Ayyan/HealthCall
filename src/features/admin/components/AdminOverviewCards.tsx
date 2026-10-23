"use client";

import React from "react";
import {
  Users,
  Building2,
  Activity,
  Stethoscope,
  CheckSquare,
  ShieldAlert,
  FileCheck2,
} from "lucide-react";
import { AdminOverviewData } from "../types";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface AdminOverviewCardsProps {
  overview: AdminOverviewData;
}

export function AdminOverviewCards({ overview }: AdminOverviewCardsProps) {
  const totalUsers = overview.totalUsers ?? overview.activeStaffCount;
  const totalPatients = overview.totalPatients ?? overview.patientsHandled;
  const activeDoctors = overview.activeDoctors ?? 0;
  const pendingTasks = overview.pendingTasks ?? 0;
  const claims = overview.insuranceClaims;
  const totalClaims = claims ? claims.total : 0;

  return (
    <div className="space-y-6">
      {/* Hospital System Command Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-md">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  Hospital Operations Master Console
                </h1>
                <Badge variant="emerald" size="sm">
                  {overview.facilityName}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1">
                Executive Administration: <span className="font-semibold text-[#142019]">{overview.administratorName}</span> • {totalUsers} Hospital Personnel • {activeDoctors} Active Doctors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-[#dce8df] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-xs font-mono text-[#28382e] font-semibold">Living Ecosystem State: {overview.ecosystemStability}</span>
          </div>
        </div>
      </div>

      {/* 5 Real MongoDB Operational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Users */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <Badge variant="teal" size="sm">PERSONNEL</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Total Users
            </p>
            <p className="text-xl font-bold font-mono text-[#142019] mt-1">
              {totalUsers.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#627267] mt-0.5">Across clinical & staff roles</p>
          </div>
        </Card>

        {/* Card 2: Total Patients */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
            <Badge variant="emerald" size="sm">PATIENTS</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Total Patients
            </p>
            <p className="text-xl font-bold font-mono text-[#142019] mt-1">
              {totalPatients.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#627267] mt-0.5">Active health profiles</p>
          </div>
        </Card>

        {/* Card 3: Active Doctors */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center">
              <Stethoscope className="h-4 w-4" />
            </div>
            <Badge variant="teal" size="sm">CLINICIANS</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Active Doctors
            </p>
            <p className="text-xl font-bold font-mono text-[#0284c7] mt-1">
              {activeDoctors.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#627267] mt-0.5">Assigned to specialty care</p>
          </div>
        </Card>

        {/* Card 4: Pending Tasks */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
            <Badge variant="amber" size="sm">WORKFLOW</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Pending Tasks
            </p>
            <p className="text-xl font-bold font-mono text-[#d97706] mt-1">
              {pendingTasks.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#627267] mt-0.5">Open hospital commitments</p>
          </div>
        </Card>

        {/* Card 5: Insurance Claims */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#ccfbf1] text-[#0d9488] flex items-center justify-center">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <Badge variant="teal" size="sm">CLAIMS</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Insurance Claims
            </p>
            <p className="text-xl font-bold font-mono text-[#0d9488] mt-1">
              {totalClaims.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#627267] mt-0.5">
              {claims ? `${claims.submitted} submitted • ${claims.underReview} review` : "Active adjudications"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
