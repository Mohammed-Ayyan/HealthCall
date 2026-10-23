"use client";

import React, { useState, useEffect } from "react";
import { PhoneCall, ShieldCheck, Flame, Clock, Filter, Plus } from "lucide-react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { CallTable } from "@/features/workflow/components/CallTable";
import { mockCallsService } from "@/features/workflow/mockCallsService";
import { Call } from "@/shared/types/call";
import { StatCard } from "@/shared/components/common/StatCard";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { LiveCallSimulatorModal } from "@/features/ai-intelligence/components/LiveCallSimulatorModal";

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    setLoading(true);
    const data = await mockCallsService.getCalls();
    setCalls(data);
    setLoading(false);
  };

  const criticalCount = calls.filter((c) => c.priority === "critical").length;
  const highCount = calls.filter((c) => c.priority === "high").length;
  const pendingInsurance = calls.filter((c) => c.summary.insurancePending).length;

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["Doctor", "Receptionist", "Insurance Employee", "Manager", "Admin"]}
        moduleName="Call Telephony & Intelligence Records"
      >
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e2e8e0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1b4332] font-mono">
                Call Management & Intelligence
              </h1>
              <Badge variant="teal" size="sm">
                Telephony Records
              </Badge>
            </div>
            <p className="text-xs text-[#607264] mt-1">
              Search, filter, and inspect diarized patient phone interactions converted into hospital actions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="emerald" size="sm" dot>
              Audio Line Active
            </Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSimulatorOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Simulate / Upload Call</span>
            </Button>
          </div>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Processed"
            value={calls.length}
            subtitle="in current cycle"
            icon={<PhoneCall className="h-5 w-5" />}
            variant="teal"
          />
          <StatCard
            title="Critical Severity"
            value={criticalCount}
            subtitle="immediate 911 / EMS"
            icon={<Flame className="h-5 w-5" />}
            variant="rose"
          />
          <StatCard
            title="High Priority"
            value={highCount}
            subtitle="under 2h response"
            icon={<Clock className="h-5 w-5" />}
            variant="amber"
          />
          <StatCard
            title="Insurance Pending"
            value={pendingInsurance}
            subtitle="prior-auth holds"
            icon={<ShieldCheck className="h-5 w-5" />}
            variant="emerald"
          />
        </div>

        {/* Main Searchable Table */}
        <CallTable calls={calls} />

        <LiveCallSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => {
            setIsSimulatorOpen(false);
            loadCalls();
          }}
        />
      </div>
      </RoleGuard>
    </AppShell>
  );
}
