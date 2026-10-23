"use client";

import React, { useEffect, useState } from "react";
import { managerService } from "@/features/manager/services/managerService";
import {
  ManagerOverviewData,
  EmployeeWorkload,
  EscalationCase,
} from "@/features/manager/types";
import { ManagerOverviewCards } from "@/features/manager/components/ManagerOverviewCards";
import { TeamWorkloadManager } from "@/features/manager/components/TeamWorkloadManager";
import { EscalationManagerCard } from "@/features/manager/components/EscalationManagerCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/Tabs";
import { Users, AlertTriangle, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { AppShell } from "@/shared/components/layout/AppShell";

export default function ManagerDashboardPage() {
  const [overview, setOverview] = useState<ManagerOverviewData | null>(null);
  const [workloads, setWorkloads] = useState<EmployeeWorkload[]>([]);
  const [escalations, setEscalations] = useState<EscalationCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, wls, escs] = await Promise.all([
          managerService.getOverview(),
          managerService.getEmployeeWorkloads(),
          managerService.getEscalations(),
        ]);
        setOverview(ov);
        setWorkloads(wls);
        setEscalations(escs);
      } catch (err) {
        console.error("Failed to load manager dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#1b4332] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-[#1b4332]">Connecting to Operations Command Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Manager", "Admin"]} moduleName="Operations & Department Manager Console">
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
          {/* 1. Manager Overview Cards */}
          <ManagerOverviewCards overview={overview} />

          {/* 2. Workload & Escalation Tabs */}
          <Tabs defaultValue="workload" className="w-full">
            <TabsList className="bg-[#edf2ea] border border-[#d8e2d6] p-1 rounded-xl">
              <TabsTrigger
                value="workload"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Users className="h-4 w-4" />
                Team Workload & Capacity ({workloads.length})
              </TabsTrigger>
              <TabsTrigger
                value="escalations"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalation Command ({escalations.filter((e) => e.status !== "Resolved").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workload" className="mt-6">
              <TeamWorkloadManager workloads={workloads} />
            </TabsContent>

            <TabsContent value="escalations" className="mt-6">
              <EscalationManagerCard initialEscalations={escalations} />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
