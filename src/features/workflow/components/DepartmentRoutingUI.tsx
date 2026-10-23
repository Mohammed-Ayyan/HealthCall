import React from "react";
import { ArrowDown, Network, ShieldCheck, Clock, UserCheck } from "lucide-react";
import { DepartmentRoutingRule } from "@/shared/types/action";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { PriorityBadge } from "@/features/ai-intelligence/components/PriorityBadge";
import { getDepartmentColorClass } from "@/shared/utils/formatters";

export interface DepartmentRoutingUIProps {
  rules: DepartmentRoutingRule[];
  className?: string;
}

export function DepartmentRoutingUI({ rules, className }: DepartmentRoutingUIProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332]">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Autonomous Department Routing Pipeline</CardTitle>
            <p className="text-[11px] text-[#607264]">
              Rule engine mapping conversation intents directly to hospital operational units
            </p>
          </div>
        </div>
        <Badge variant="emerald" size="sm">
          Active SLA Rules
        </Badge>
      </CardHeader>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-[#f7f9f6] border border-[#e2e8e0] flex flex-col justify-between space-y-3"
          >
            {/* Top Source Intent */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e2e8e0] flex items-center justify-between shadow-2xs">
              <span className="text-xs font-bold text-[#142019]">{rule.intent}</span>
              <Badge variant="teal" size="sm">
                Intent
              </Badge>
            </div>

            {/* Transition Arrow */}
            <div className="flex items-center justify-center text-[#8fa394]">
              <ArrowDown className="h-4 w-4 text-[#059669]" />
            </div>

            {/* Destination Department */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e2e8e0] space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getDepartmentColorClass(
                    rule.targetDepartment
                  )}`}
                >
                  {rule.targetDepartment}
                </span>
                <PriorityBadge priority={rule.defaultPriority} size="sm" />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#607264] pt-1 border-t border-[#edf2ec] font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#059669]" />
                  Target: {rule.slaTargetHours}h
                </span>
                {rule.autoAssignee && (
                  <span className="flex items-center gap-1 text-[#142019]">
                    <UserCheck className="h-3 w-3 text-[#0d9488]" />
                    {rule.autoAssignee}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
