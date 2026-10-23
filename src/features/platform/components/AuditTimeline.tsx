import React from "react";
import { History, Shield, Bot, Server, User, Clock, CheckCircle2 } from "lucide-react";
import { AuditEvent } from "@/shared/types/audit";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/utils/cn";

export interface AuditTimelineProps {
  events: AuditEvent[];
  className?: string;
}

export function AuditTimeline({ events, className }: AuditTimelineProps) {
  const getActorIcon = (actor: AuditEvent["actor"]) => {
    switch (actor) {
      case "System AI":
        return <Bot className="h-3.5 w-3.5 text-[#059669]" />;
      case "CareOps Engine":
        return <Server className="h-3.5 w-3.5 text-[#0d9488]" />;
      case "Staff User":
      case "Manager":
        return <User className="h-3.5 w-3.5 text-[#d97706]" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332]">
            <History className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Autonomous Audit & Compliance Timeline</CardTitle>
            <p className="text-[11px] text-[#607264]">
              Immutable end-to-end ledger tracing each lifecycle event from call ring to resolution
            </p>
          </div>
        </div>
        <Badge variant="emerald" size="sm">
          Cryptographically Verified
        </Badge>
      </CardHeader>

      <div className="mt-5 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-[#059669] before:via-[#0d9488] before:to-[#1b4332]">
        {events.map((event, index) => (
          <div key={event.id} className="relative group">
            {/* Step node dot */}
            <div className="absolute -left-[27px] top-1 h-5 w-5 rounded-full bg-white border-2 border-[#059669] flex items-center justify-center shadow-xs group-hover:scale-125 transition-transform">
              <div className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
            </div>

            <div className="p-3.5 rounded-xl bg-[#f7f9f6] border border-[#e2e8e0] hover:border-[#059669]/40 hover:bg-white transition-all space-y-1.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#059669]">
                    {event.timestamp}
                  </span>
                  <span className="text-xs font-bold text-[#142019]">{event.title}</span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-[10px] font-mono text-[#607264] border border-[#e2e8e0]">
                  {getActorIcon(event.actor)}
                  <span>{event.actor}</span>
                </div>
              </div>

              <p className="text-xs text-[#4a5f52] leading-relaxed">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
