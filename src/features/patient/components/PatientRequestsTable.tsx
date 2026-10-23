"use client";

import React from "react";
import { FileText, ShieldAlert, Pill, Clock, ArrowRight, Activity, CheckCircle2 } from "lucide-react";
import { PatientRequest } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface PatientRequestsTableProps {
  requests: PatientRequest[];
}

export function PatientRequestsTable({ requests }: PatientRequestsTableProps) {
  const getStatusBadge = (status: PatientRequest["status"]) => {
    switch (status) {
      case "In Progress":
        return <Badge variant="teal">IN PROGRESS</Badge>;
      case "Under Review":
        return <Badge variant="amber">UNDER REVIEW</Badge>;
      case "Action Required":
        return <Badge variant="rose">ACTION REQUIRED</Badge>;
      case "Resolved":
        return <Badge variant="emerald">RESOLVED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: PatientRequest["category"]) => {
    switch (category) {
      case "Insurance":
        return <ShieldAlert className="h-4 w-4 text-[#d97706]" />;
      case "Prescription":
        return <Pill className="h-4 w-4 text-[#0d9488]" />;
      default:
        return <FileText className="h-4 w-4 text-[#059669]" />;
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Patient Requests & Commitments</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Automatically generated and assigned from recent patient telephony calls
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[#1b4332] bg-[#e8f3ec] px-3 py-1 rounded-full border border-[#d2e4d6]">
            {requests.length} Active Tracks
          </span>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No care requests or follow-up commitments on record.
          </div>
        ) : (
          requests.map((req) => (
          <div
            key={req.id}
            className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 h-8 w-8 rounded-lg bg-[#f4f7f4] border border-[#e2e8df] flex items-center justify-center">
                {getCategoryIcon(req.category)}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm font-semibold text-[#142019]">{req.title}</h4>
                  {getStatusBadge(req.status)}
                </div>
                <p className="text-xs text-[#627267] mt-1">
                  Department: <span className="text-[#142019] font-medium">{req.department}</span> • Created:{" "}
                  <span className="font-mono text-[#4a5a50]">{req.createdDate}</span>
                </p>
                <div className="mt-2 text-xs bg-[#f7f9f6] text-[#28382e] p-2.5 rounded-lg border border-[#e2e8df] max-w-2xl">
                  <span className="text-[#059669] font-semibold">Latest Hospital Action:</span>{" "}
                  {req.lastUpdateNotes}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:items-end justify-between pl-11 md:pl-0">
              <div className="flex items-center gap-2 text-xs font-mono text-[#92400e] bg-[#fefce8] px-3 py-1.5 rounded-lg border border-[#fef08a]">
                <Clock className="h-3.5 w-3.5" />
                <span>Est: {req.estimatedResolution}</span>
              </div>
              <span className="text-[11px] font-mono text-[#94a399] mt-2">
                ID: {req.id}
              </span>
            </div>
          </div>
        ))
      )}
      </div>
    </Card>
  );
}
