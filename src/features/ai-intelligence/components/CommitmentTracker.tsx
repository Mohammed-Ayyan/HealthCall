"use client";

import React, { useState } from "react";
import { Handshake, Clock, User, CheckCircle2, AlertCircle, Quote } from "lucide-react";
import { Commitment } from "@/shared/types/call";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/utils/cn";

export interface CommitmentTrackerProps {
  commitments: Commitment[];
  className?: string;
}

export function CommitmentTracker({ commitments: initial, className }: CommitmentTrackerProps) {
  const [commitments, setCommitments] = useState<Commitment[]>(initial);

  const toggleStatus = (id: string) => {
    setCommitments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: c.status === "fulfilled" ? "pending" : "fulfilled",
            }
          : c
      )
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332]">
            <Handshake className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Spoken Commitment & Promise Tracker</CardTitle>
            <p className="text-[11px] text-[#607264]">
              Audit trail of operational guarantees verbally delivered to the patient
            </p>
          </div>
        </div>
        <Badge variant="emerald" size="sm">
          {commitments.filter((c) => c.status === "fulfilled").length}/{commitments.length} Fulfilled
        </Badge>
      </CardHeader>

      <div className="mt-4 space-y-3">
        {commitments.map((com) => {
          const isFulfilled = com.status === "fulfilled";

          return (
            <div
              key={com.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200 space-y-2.5",
                isFulfilled
                  ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#607264]"
                  : "bg-[#f7f9f6] border-[#e2e8e0] text-[#142019] hover:border-[#059669]/40 shadow-2xs"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => toggleStatus(com.id)}
                    className={cn(
                      "mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer",
                      isFulfilled
                        ? "bg-[#059669] border-[#047857] text-white"
                        : "border-[#c8e6c9] bg-white hover:border-[#059669]"
                    )}
                  >
                    {isFulfilled && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
                  </button>

                  <div>
                    <h4
                      className={cn(
                        "text-sm font-semibold transition-all",
                        isFulfilled && "line-through text-[#8fa394]"
                      )}
                    >
                      {com.commitment}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#607264] font-mono">
                      <span className="flex items-center gap-1 text-[#0d9488]">
                        <User className="h-3.5 w-3.5" />
                        Owner: {com.owner}
                      </span>
                      <span className="flex items-center gap-1 text-[#d97706]">
                        <Clock className="h-3.5 w-3.5" />
                        Deadline: {com.deadline}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge
                  variant={isFulfilled ? "emerald" : "amber"}
                  size="sm"
                  dot={!isFulfilled}
                >
                  {isFulfilled ? "FULFILLED" : "PENDING COMMITMENT"}
                </Badge>
              </div>

              {/* Exact Spoken Evidence */}
              <div className="p-2.5 rounded-lg bg-white border border-[#e2e8e0] text-xs text-[#4a5f52] flex items-start gap-2">
                <Quote className="h-3 w-3 text-[#059669] mt-0.5 flex-shrink-0" />
                <p className="italic text-[11px]">&ldquo;{com.evidenceQuote}&rdquo;</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
