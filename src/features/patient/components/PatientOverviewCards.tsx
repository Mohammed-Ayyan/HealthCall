"use client";

import React from "react";
import { Calendar, ShieldCheck, Clock, HeartPulse, User, ArrowUpRight } from "lucide-react";
import { PatientOverviewData, PatientAppointment } from "../types";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface PatientOverviewCardsProps {
  overview: PatientOverviewData;
  nextAppointment?: PatientAppointment;
}

export function PatientOverviewCards({ overview, nextAppointment }: PatientOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* Patient Greeting Banner - Solarpunk Eco-Futuristic Style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-md">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  Welcome back, {overview.patientName}
                </h1>
                <Badge variant="teal" size="sm" className="font-mono">
                  {overview.mrn}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[#059669]" />
                Primary Care: <span className="text-[#142019] font-medium">{overview.assignedPCP}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-[#dce8df] shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
            </span>
            <span className="text-xs text-[#28382e] font-semibold">CareOps Telephony Sync Active</span>
          </div>
        </div>
      </div>

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Upcoming Appointment */}
        <Card className="bg-white border-[#e2e8df] p-5 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <Badge variant={nextAppointment ? (nextAppointment.status === "confirmed" ? "emerald" : "amber") : "default"}>
              {nextAppointment?.status ? nextAppointment.status.toUpperCase() : "NONE"}
            </Badge>
          </div>
          
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
              Upcoming Appointment
            </p>
            {nextAppointment ? (
              <div className="mt-2">
                <p className="text-base font-bold text-[#142019]">{nextAppointment.doctorName}</p>
                <p className="text-xs text-[#627267]">{nextAppointment.doctorSpecialty}</p>
                <div className="mt-3 flex items-center gap-4 text-xs font-mono text-[#1b4332] bg-[#f4f8f5] px-3 py-2 rounded-lg border border-[#dce8df]">
                  <span>{nextAppointment.date}</span>
                  <span>•</span>
                  <span>{nextAppointment.time}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm font-semibold text-[#627267]">No upcoming appointments</p>
                <p className="text-xs text-[#627267]">Book a consultation slot below</p>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Insurance Status */}
        <Card className="bg-white border-[#e2e8df] p-5 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <Badge variant="amber">VERIFYING</Badge>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
              Insurance Status
            </p>
            <p className="text-base font-bold text-[#142019] mt-2">{overview.insuranceStatus}</p>
            <p className="text-xs text-[#627267] mt-1">{overview.insuranceProvider}</p>
            
            <div className="mt-3 text-xs text-[#92400e] bg-[#fefce8] px-3 py-2 rounded-lg border border-[#fef08a] flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#d97706]" />
              <span>Prior-auth documents in review by hospital team</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Pending Actions */}
        <Card className="bg-white border-[#e2e8df] p-5 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[#ccfbf1] text-[#0d9488] flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-[#0d9488] bg-[#f0fdfa] px-2.5 py-1 rounded-full border border-[#99f6e4]">
              {overview.pendingRequestsCount} ACTIVE
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
              Pending Actions
            </p>
            <p className="text-base font-bold text-[#142019] mt-2">
              {overview.pendingRequestsCount} Workflows In Progress
            </p>
            <p className="text-xs text-[#627267] mt-1">
              Generated from CareOps voice telephony triage
            </p>
            
            <div className="mt-3 text-xs text-[#0d9488] font-medium bg-[#f0fdfa] px-3 py-2 rounded-lg border border-[#ccfbf1] flex items-center justify-between">
              <span>View open inquiries</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
