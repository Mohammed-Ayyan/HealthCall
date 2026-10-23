"use client";

import React, { useState } from "react";
import { Sliders, Bell, Sparkles, Route, Check, X } from "lucide-react";
import { SystemRuleConfig } from "../types";
import { adminService } from "../services/adminService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface SystemSettingsManagerProps {
  initialRules: SystemRuleConfig[];
}

export function SystemSettingsManager({ initialRules }: SystemSettingsManagerProps) {
  const [rules, setRules] = useState<SystemRuleConfig[]>(initialRules);

  const handleToggle = async (id: string) => {
    await adminService.toggleRule(id);
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const getCategoryIcon = (category: SystemRuleConfig["category"]) => {
    switch (category) {
      case "Notification Rules":
        return <Bell className="h-4 w-4 text-[#059669]" />;
      case "AI Settings":
        return <Sparkles className="h-4 w-4 text-[#0d9488]" />;
      case "Routing Rules":
        return <Route className="h-4 w-4 text-[#d97706]" />;
      default:
        return <Sliders className="h-4 w-4 text-[#627267]" />;
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">CareOps System Policy & Routing Engine</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Configure notification escalations, speech extraction thresholds, and autonomous department routing
              </p>
            </div>
          </div>
          <Badge variant="teal">Engine v2.4 Active</Badge>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center flex-shrink-0 mt-0.5">
                {getCategoryIcon(rule.category)}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm font-bold text-[#142019]">{rule.title}</h4>
                  <Badge variant="default" size="sm">
                    {rule.category}
                  </Badge>
                  <span className="text-xs font-mono font-semibold text-[#1b4332] bg-[#e8f3ec] px-2 py-0.5 rounded border border-[#cbe2d1]">
                    Param: {rule.value}
                  </span>
                </div>
                <p className="text-xs text-[#28382e] mt-1.5 max-w-2xl leading-relaxed">
                  {rule.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <Button
                variant={rule.enabled ? "primary" : "outline"}
                size="sm"
                onClick={() => handleToggle(rule.id)}
                className={
                  rule.enabled
                    ? "flex items-center gap-1.5"
                    : "border-[#e2e8df] text-[#627267] hover:text-[#142019]"
                }
              >
                {rule.enabled ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Rule Active</span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Disabled</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
