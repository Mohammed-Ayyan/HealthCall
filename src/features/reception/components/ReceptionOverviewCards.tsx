"use client";

import React from "react";
import { UserCheck, Clock, CheckCircle2, XCircle, PhoneForwarded } from "lucide-react";
import { ReceptionOverviewData } from "../types";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface ReceptionOverviewCardsProps {
  overview: ReceptionOverviewData;
}

export function ReceptionOverviewCards({ overview }: ReceptionOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* Front Desk Header - Solarpunk Aesthetic */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-md">
              <UserCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  Front Desk Hub • {overview.receptionistName}
                </h1>
                <Badge variant="teal" size="sm">
                  {overview.frontDeskStation}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1">
                Ecosystem Patient Ingestion & Telephony Dispatch Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-[#dce8df] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-xs font-mono text-[#28382e] font-semibold">CareOps Voice Gateway Active</span>
          </div>
        </div>
      </div>

      {/* 4 Cards: Pending Bookings, Confirmed, Cancelled, Open Call Tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <Badge variant="amber" size="sm">PENDING</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Pending Bookings
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.pendingBookingsCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Awaiting staff confirmation</p>
          </div>
        </Card>

        {/* Card 2: Confirmed */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <Badge variant="emerald" size="sm">CONFIRMED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Confirmed Today
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.confirmedAppointmentsCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Ready for arrival check-in</p>
          </div>
        </Card>

        {/* Card 3: Cancelled */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
            <Badge variant="rose" size="sm">CANCELLED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Cancelled Requests
            </p>
            <p className="text-xl font-bold text-[#dc2626] mt-1">{overview.cancelledRequestsCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Slots freed for triage</p>
          </div>
        </Card>

        {/* Card 4: Open Call Tasks */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#ccfbf1] text-[#0d9488] flex items-center justify-center">
              <PhoneForwarded className="h-4 w-4" />
            </div>
            <Badge variant="teal" size="sm">AI TASKS</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              AI Call Actions
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.openCallTasksCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Tasks from call analyzer</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
