"use client";

import React from "react";
import { Stethoscope, Calendar, Clock, AlertTriangle, UserCheck, ArrowRight } from "lucide-react";
import { DoctorOverviewData } from "../types";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface DoctorOverviewCardsProps {
  overview: DoctorOverviewData;
}

export function DoctorOverviewCards({ overview }: DoctorOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* Clinician Header Banner - Solarpunk Light Aesthetic */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-md">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  {overview.doctorName}
                </h1>
                <Badge variant="teal" size="sm">
                  {overview.department}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1">
                {overview.specialty} • Active Clinical Station
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-[#dce8df] text-right shadow-xs">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#627267]">Next Consultation</p>
              <p className="text-base font-mono font-bold text-[#1b4332]">{overview.nextPatientTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metric Operational Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Today's Appointments */}
        <Card className="bg-white border-[#e2e8df] p-5 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-[#1b4332] bg-[#f4f8f5] px-2.5 py-1 rounded-full border border-[#dce8df]">
              TODAY'S SCHEDULE
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
              Today's Appointments
            </p>
            <p className="text-2xl font-bold text-[#142019] mt-1">
              {overview.todaysAppointmentsCount} Consultations
            </p>
            <p className="text-xs text-[#627267] mt-1">
              All slots synced with CareOps reception queue
            </p>
          </div>
        </Card>

        {/* Card 2: Pending Follow-ups */}
        <Card className="bg-white border-[#e2e8df] p-5 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-[#d97706] bg-[#fefce8] px-2.5 py-1 rounded-full border border-[#fef08a]">
              FOLLOW-UPS
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
              Pending Follow-ups
            </p>
            <p className="text-2xl font-bold text-[#142019] mt-1">
              {overview.pendingFollowupsCount} Patients
            </p>
            <p className="text-xs text-[#627267] mt-1">
              Requiring chart review, lab evaluation or call backs
            </p>
          </div>
        </Card>

        {/* Card 3: Urgent Cases */}
        <Card className="bg-white border-[#e2e8df] p-5 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge variant="rose">TRIAGE ELEVATED</Badge>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
              Urgent Cases
            </p>
            <p className="text-2xl font-bold text-[#dc2626] mt-1">
              {overview.urgentCasesCount} Flagged Issues
            </p>
            <p className="text-xs text-[#627267] mt-1">
              Flagged by CareOps AI speech sentiment & vitals triage
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
