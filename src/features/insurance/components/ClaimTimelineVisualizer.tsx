"use client";

import React from "react";
import { CheckCircle2, Clock, CircleDot, ArrowRight, ShieldCheck } from "lucide-react";
import { InsuranceClaim, ClaimTimelineStage } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface ClaimTimelineVisualizerProps {
  claim: InsuranceClaim;
  onAdvanceStage?: (claimId: string, nextStage: ClaimTimelineStage) => void;
}

const STAGES: ClaimTimelineStage[] = ["Submitted", "Reviewed", "Updated", "Completed"];

export function ClaimTimelineVisualizer({ claim, onAdvanceStage }: ClaimTimelineVisualizerProps) {
  const currentStageIndex = STAGES.indexOf(claim.currentStage);
  const nextStage = STAGES[currentStageIndex + 1] as ClaimTimelineStage | undefined;

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-[#142019]">
              Claim Lifecycle Timeline • {claim.claimId}
            </CardTitle>
            <p className="text-xs text-[#627267] mt-0.5">
              Multi-tier insurance adjudication & prior-authorization state tracker
            </p>
          </div>

          {nextStage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onAdvanceStage) onAdvanceStage(claim.id, nextStage);
              }}
              className="border-[#dce8df] text-[#1b4332] hover:bg-[#e8f3ec] flex items-center gap-1.5"
            >
              <span>Advance to {nextStage}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="p-6 space-y-8">
        {/* Progress Bar with Steps */}
        <div className="relative">
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-[#e2e8df] -z-0" />
          <div
            className="absolute top-5 left-6 h-0.5 bg-[#059669] transition-all duration-500 -z-0"
            style={{
              width: `${(currentStageIndex / (STAGES.length - 1)) * 90}%`,
            }}
          />

          <div className="flex items-center justify-between relative z-10">
            {STAGES.map((stg, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stg} className="flex flex-col items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-all ${
                      isPast
                        ? "bg-[#e8f3ec] border-[#059669] text-[#059669]"
                        : isCurrent
                        ? "bg-[#1b4332] border-[#1b4332] text-white ring-4 ring-[#1b4332]/20 shadow-xs"
                        : "bg-white border-[#dce8df] text-[#94a399]"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                    ) : isCurrent ? (
                      <CircleDot className="h-5 w-5 text-white animate-pulse" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-2.5 text-xs font-semibold ${
                      isCurrent
                        ? "text-[#1b4332]"
                        : isPast
                        ? "text-[#28382e]"
                        : "text-[#94a399]"
                    }`}
                  >
                    {stg}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Log Records */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-[#627267] uppercase tracking-wider">
            Audit Records & Stage Details
          </h4>
          <div className="space-y-2">
            {claim.timelineHistory.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  item.completed
                    ? "bg-[#fcfdfc] border-[#e2e8df] text-[#28382e]"
                    : "bg-[#f7f9f6] border-[#edf2ea] text-[#94a399]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.completed ? "bg-[#059669]" : "bg-[#cbd5e1]"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-[#142019] mr-2">{item.stage}:</span>
                    <span>{item.details}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#627267] sm:text-right whitespace-nowrap pl-5 sm:pl-0">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
