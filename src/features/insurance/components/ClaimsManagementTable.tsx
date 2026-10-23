"use client";

import React from "react";
import { FileText, ShieldAlert, Clock, ArrowRight, CheckCircle2, XCircle, Search } from "lucide-react";
import { InsuranceClaim } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface ClaimsManagementTableProps {
  claims: InsuranceClaim[];
  selectedClaimId: string;
  onSelectClaim: (claim: InsuranceClaim) => void;
}

export function ClaimsManagementTable({
  claims,
  selectedClaimId,
  onSelectClaim,
}: ClaimsManagementTableProps) {
  const getStatusBadge = (status: InsuranceClaim["status"]) => {
    switch (status) {
      case "Approved":
        return <Badge variant="emerald">APPROVED</Badge>;
      case "Pending Review":
        return <Badge variant="amber">PENDING REVIEW</Badge>;
      case "Under Carrier Audit":
        return <Badge variant="teal">CARRIER AUDIT</Badge>;
      case "Rejected":
        return <Badge variant="rose">REJECTED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: InsuranceClaim["priority"]) => {
    switch (priority) {
      case "Urgent":
        return <Badge variant="rose" size="sm">URGENT</Badge>;
      case "High":
        return <Badge variant="amber" size="sm">HIGH</Badge>;
      case "Medium":
        return <Badge variant="teal" size="sm">MEDIUM</Badge>;
      default:
        return <Badge variant="default" size="sm">ROUTINE</Badge>;
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Claims & Prior-Auth Ledger</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Select a case to inspect CareOps voice extracts and audit timelines
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[#1b4332] bg-[#e8f3ec] px-3 py-1 rounded-full border border-[#d2e4d6]">
            {claims.length} Records
          </span>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {claims.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No claims or prior-authorizations currently available.
          </div>
        ) : (
          claims.map((claim) => {
          const isSelected = claim.id === selectedClaimId;
          return (
            <div
              key={claim.id}
              onClick={() => onSelectClaim(claim)}
              className={`p-5 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                isSelected
                  ? "bg-[#e8f3ec]/60 border-l-4 border-l-[#1b4332]"
                  : "hover:bg-[#fbfdfb]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#f4f8f5] text-[#1b4332] border border-[#dce8df] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{claim.patientName}</h4>
                    <span className="text-xs font-mono text-[#059669] font-bold">
                      {claim.claimId}
                    </span>
                    <span className="text-xs font-mono text-[#627267]">({claim.mrn})</span>
                    {getStatusBadge(claim.status)}
                    {getPriorityBadge(claim.priority)}
                  </div>

                  <p className="text-xs text-[#28382e] mt-1">
                    Payer: <span className="text-[#142019] font-semibold">{claim.payerName}</span> • Type:{" "}
                    <span className="text-[#627267]">{claim.claimType}</span>
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#627267] mt-2 font-mono flex-wrap">
                    <span className="text-[#142019] font-semibold">Amount: {claim.amount}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#b45309]">
                      <Clock className="h-3 w-3 text-[#d97706]" /> Deadline: {claim.deadline}
                    </span>
                    <span>•</span>
                    <span className="text-[#627267]">Stage: {claim.currentStage}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end lg:self-center">
                <Button
                  variant={isSelected ? "primary" : "outline"}
                  size="sm"
                  className={isSelected ? "" : "border-[#dce8df] text-[#28382e]"}
                >
                  <span>{isSelected ? "Inspecting" : "Inspect"}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          );
        }))}
      </div>
    </Card>
  );
}
