"use client";

import React, { useState } from "react";
import { PhoneCall, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Bot, Clock } from "lucide-react";
import { CommunicationRecord } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface CommunicationHistoryListProps {
  records: CommunicationRecord[];
}

export function CommunicationHistoryList({ records }: CommunicationHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(records[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Communication & Telephony History</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Past conversations, synthesized AI clinical extracts, and verified hospital responses
              </p>
            </div>
          </div>
          <Badge variant="teal">CareOps Voice Engine</Badge>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {records.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No telephony or clinical voice records found.
          </div>
        ) : (
          records.map((rec) => {
          const isExpanded = expandedId === rec.id;
          return (
            <div key={rec.id} className="p-5 hover:bg-[#fbfdfb] transition-colors">
              <div
                className="flex items-start md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => toggleExpand(rec.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center flex-shrink-0">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#142019]">
                        {rec.callNumber}
                      </span>
                      <Badge variant="default" size="sm">
                        {rec.channel}
                      </Badge>
                      <Badge variant={rec.status === "Resolved" ? "emerald" : "amber"} size="sm">
                        {rec.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#627267] mt-1">
                      <span>{rec.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" /> {rec.duration}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-[#627267] hover:text-[#142019]">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#edf2ea] space-y-4">
                  {/* AI Summary Section */}
                  <div className="bg-[#f7f9f6] rounded-xl p-4 border border-[#e2e8df]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1b4332] mb-2">
                      <Bot className="h-4 w-4 text-[#059669]" />
                      <span>CareOps Clinical Speech Summary</span>
                    </div>
                    <p className="text-xs text-[#28382e] leading-relaxed">{rec.summary}</p>
                  </div>

                  {/* Commitments Made */}
                  <div>
                    <p className="text-xs font-semibold text-[#627267] uppercase tracking-wider mb-2">
                      Commitments Detected & Logged
                    </p>
                    <div className="space-y-1.5">
                      {rec.commitmentsMade.map((commit, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-[#142019] bg-[#f0fdf4] px-3 py-2 rounded-lg border border-[#dcfce7]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] mt-0.5 flex-shrink-0" />
                          <span>{commit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hospital Response */}
                  <div className="bg-[#f0fdfa] p-3.5 rounded-xl border border-[#ccfbf1]">
                    <p className="text-xs font-semibold text-[#0d9488] uppercase tracking-wider mb-1">
                      Hospital Action & Care Team Response
                    </p>
                    <p className="text-xs text-[#134e4a]">{rec.hospitalResponse}</p>
                  </div>
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </Card>
  );
}
