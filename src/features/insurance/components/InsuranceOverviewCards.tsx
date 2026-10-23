"use client";

import React from "react";
import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { InsuranceOverviewData } from "../types";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface InsuranceOverviewCardsProps {
  overview: InsuranceOverviewData;
}

export function InsuranceOverviewCards({ overview }: InsuranceOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* Insurance Division Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  Insurance & RCM Desk • {overview.employeeName}
                </h1>
                <Badge variant="teal" size="sm">
                  {overview.department}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1">
                Prior-Auth Clearance, Claim Ingestion & Payer Dispute Resolution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-[#dce8df] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-xs font-mono text-[#28382e] font-semibold">Payer EDI Gateway 837/835 Connected</span>
          </div>
        </div>
      </div>

      {/* 4 Cards: Pending claims, Approved claims, Rejected claims, Urgent cases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Claims */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <Badge variant="amber" size="sm">IN QUEUE</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Pending Claims
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.pendingClaimsCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Awaiting carrier response</p>
          </div>
        </Card>

        {/* Card 2: Approved Claims */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <Badge variant="emerald" size="sm">APPROVED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Approved Claims
            </p>
            <p className="text-xl font-bold text-[#142019] mt-1">{overview.approvedClaimsCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Cleared for reimbursement</p>
          </div>
        </Card>

        {/* Card 3: Rejected Claims */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
            <Badge variant="rose" size="sm">DENIED</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Rejected Claims
            </p>
            <p className="text-xl font-bold text-[#dc2626] mt-1">{overview.rejectedClaimsCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Appeal packets in draft</p>
          </div>
        </Card>

        {/* Card 4: Urgent Cases */}
        <Card className="bg-white border-[#e2e8df] p-4 hover:border-[#1b4332]/40 transition-all shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <Badge variant="rose" size="sm">CRITICAL</Badge>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#627267] uppercase tracking-wider font-semibold">
              Urgent Cases
            </p>
            <p className="text-xl font-bold text-[#dc2626] mt-1">{overview.urgentCasesCount}</p>
            <p className="text-[11px] text-[#627267] mt-0.5">Flagged by patient delay</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
