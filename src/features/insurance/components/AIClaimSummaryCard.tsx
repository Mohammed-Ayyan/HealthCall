"use client";

import React from "react";
import { Bot, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { InsuranceClaim } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface AIClaimSummaryCardProps {
  claim: InsuranceClaim;
  onVerifyStatus?: (claimId: string) => void;
}

export function AIClaimSummaryCard({ claim, onVerifyStatus }: AIClaimSummaryCardProps) {
  return (
    <Card className="bg-white border-[#e2e8df] relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.06),transparent_70%)] pointer-events-none" />

      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">CareOps AI Claim Intelligence</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Targeting: {claim.patientName} • Claim ID:{" "}
                <span className="font-mono text-[#059669] font-bold">{claim.claimId}</span>
              </p>
            </div>
          </div>
          <Badge variant="teal">Speech-to-Claim Sync</Badge>
        </div>
      </CardHeader>

      <div className="p-5 space-y-5">
        {/* Patient Conversation Summary */}
        <div className="bg-[#f7f9f6] p-4 rounded-xl border border-[#e2e8df]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1b4332] uppercase tracking-wider mb-2">
            <Bot className="h-4 w-4 text-[#059669]" />
            <span>Patient Conversation Summary</span>
          </div>
          <blockquote className="text-sm font-medium text-[#28382e] italic leading-relaxed border-l-2 border-[#059669] pl-3 py-0.5">
            "{claim.aiConversationSummary}"
          </blockquote>
          <p className="text-[11px] text-[#627267] mt-2 font-mono">
            Carrier: <span className="text-[#142019] font-semibold">{claim.payerName}</span> • Amount:{" "}
            <span className="text-[#059669] font-bold">{claim.amount}</span>
          </p>
        </div>

        {/* Required Action */}
        <div className="bg-[#f0fdf4] p-4 rounded-xl border border-[#bbf7d0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#15803d] uppercase tracking-wider mb-1">
              <AlertCircle className="h-4 w-4 text-[#16a34a]" />
              <span>Required Operational Action</span>
            </div>
            <p className="text-xs text-[#14532d] font-medium">
              {claim.requiredAction}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (onVerifyStatus) onVerifyStatus(claim.id);
            }}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Verify Claim Status</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
