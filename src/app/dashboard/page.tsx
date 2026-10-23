"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  HeartPulse,
  Stethoscope,
  Users,
  Activity,
  Layers,
  Leaf,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { StatCard } from "@/shared/components/common/StatCard";
import { LiveCallMonitor } from "@/features/ai-intelligence/components/LiveCallMonitor";
import { EscalationBanner } from "@/features/workflow/components/EscalationBanner";
import { AnalyticsCharts } from "@/features/platform/components/AnalyticsCharts";
import { ReportsExporter } from "@/features/platform/components/ReportsExporter";
import { mockCallService } from "@/features/ai-intelligence/mockCallService";
import { mockCallsService } from "@/features/workflow/mockCallsService";
import { apiTaskService } from "@/features/platform/tasks/apiTaskService";
import { apiAnalyticsService } from "@/features/platform/analytics/apiAnalyticsService";
import { Call } from "@/shared/types/call";
import { ActionItem } from "@/shared/types/action";
import {
  AnalyticsSummary,
  CallVolumePoint,
  CategoryDistribution,
  DepartmentWorkload,
  ResolutionTimeMetric,
} from "@/shared/types/analytics";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";

export default function DashboardPage() {
  const [liveCall, setLiveCall] = useState<Call | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [escalatedTasks, setEscalatedTasks] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [volumeTrends, setVolumeTrends] = useState<CallVolumePoint[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [workloads, setWorkloads] = useState<DepartmentWorkload[]>([]);
  const [resolutionMetrics, setResolutionMetrics] = useState<ResolutionTimeMetric[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const [call, recent, escalated, sum, trends, cats, load, res] = await Promise.all([
      mockCallService.getLiveCall(),
      mockCallsService.getRecentCalls(5),
      apiTaskService
        .getTasks()
        .then((tasks) => tasks.filter((t) => t.isEscalated || t.sla?.isBreached))
        .catch(() => []),
      apiAnalyticsService.getSummary(),
      apiAnalyticsService.getVolumeTrends(),
      apiAnalyticsService.getCategoryDistribution(),
      apiAnalyticsService.getDepartmentWorkloads(),
      apiAnalyticsService.getResolutionTimeMetrics(),
    ]);

    setLiveCall(call);
    setRecentCalls(recent);
    setEscalatedTasks(escalated);
    setSummary(sum);
    setVolumeTrends(trends);
    setCategories(cats);
    setWorkloads(load);
    setResolutionMetrics(res);
  };

  const portalShortcuts = [
    { name: "Patient Portal", href: "/patient/dashboard", icon: HeartPulse, count: "Active" },
    { name: "Doctor Portal", href: "/doctor/dashboard", icon: Stethoscope, count: "8 appts" },
    { name: "Reception Desk", href: "/reception/dashboard", icon: Users, count: "4 pending" },
    { name: "Insurance Hub", href: "/insurance/dashboard", icon: ShieldCheck, count: "14 claims" },
    { name: "Dept Manager", href: "/manager/dashboard", icon: Activity, count: "18 staff" },
    { name: "Hospital Admin", href: "/admin/dashboard", icon: Building2, count: "5 depts" },
  ];

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["Doctor", "Receptionist", "Insurance Employee", "Manager", "Admin"]}
        moduleName="Healthcare Operations Command"
      >
        <div className="space-y-6">
        {/* Healthcare Ecosystem Command Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e2e8e0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1b4332] font-mono">
                Healthcare Ecosystem Command Center
              </h1>
              <Badge variant="emerald" size="sm" dot>
                Shift Equilibrium: Stable
              </Badge>
            </div>
            <p className="text-xs text-[#607264] mt-1">
              Living system operational metrics, conversational speech synthesis, and clinical routing
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8e0] text-[#142019] shadow-2xs">
              Extraction Precision: <strong className="text-[#059669]">99.2%</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8e0] text-[#142019] shadow-2xs">
              Commitment SLA: <strong className="text-[#059669]">97.4%</strong>
            </span>
          </div>
        </div>

        {/* 6 Role Portal Quick Access Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {portalShortcuts.map((ps) => {
            const Icon = ps.icon;
            return (
              <Link
                key={ps.name}
                href={ps.href}
                className="bg-white hover:bg-[#f0fdf4] p-3 rounded-xl border border-[#e2e8e0] hover:border-[#059669]/60 shadow-2xs hover:shadow-xs transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332] group-hover:scale-105 transition-transform">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#142019] group-hover:text-[#059669] transition-colors leading-tight">
                      {ps.name}
                    </p>
                    <span className="text-[10px] font-mono text-[#607264]">{ps.count}</span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-[#8fa394] group-hover:text-[#059669] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            );
          })}
        </div>

        {/* Manager Escalation Alert if any */}
        {escalatedTasks.length > 0 && <EscalationBanner escalatedTasks={escalatedTasks} />}

        {/* Living System Operational Metrics */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Patient Wellness Flow (Calls)"
              value={summary.totalCalls.toLocaleString()}
              changePercent={summary.callsChangePercent}
              subtitle="vs yesterday"
              icon={<PhoneCall className="h-5 w-5" />}
              variant="teal"
            />
            <StatCard
              title="Fulfilled Commitments"
              value={summary.completedTasks.toLocaleString()}
              changePercent={summary.tasksChangePercent}
              subtitle="autonomous dispatch"
              icon={<CheckCircle2 className="h-5 w-5" />}
              variant="emerald"
            />
            <StatCard
              title="Active Clinical Flow Queue"
              value={summary.pendingActions}
              subtitle="across 5 hospital divisions"
              icon={<Clock className="h-5 w-5" />}
              variant="amber"
            />
            <StatCard
              title="Urgent Triage Incidents"
              value={summary.criticalCases}
              changePercent={summary.criticalChangePercent}
              subtitle="immediate attention"
              icon={<Activity className="h-5 w-5" />}
              variant="rose"
            />
          </div>
        )}

        {/* Live Active Telephony Card */}
        {liveCall && <LiveCallMonitor call={liveCall} />}

        {/* Analytics Charts & Trends */}
        {volumeTrends.length > 0 && (
          <AnalyticsCharts
            volumeTrends={volumeTrends}
            categories={categories}
            departmentWorkloads={workloads}
            resolutionMetrics={resolutionMetrics}
          />
        )}

        {/* Quick Recent Calls Feed & Reports Exporter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1b4332] font-mono">
                Recent Patient Telephony Stream
              </h3>
              <Link
                href="/calls"
                className="text-xs text-[#059669] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View all calls</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#e2e8e0] bg-white divide-y divide-[#edf2ec] shadow-sm overflow-hidden">
              {recentCalls.map((c) => (
                <Link
                  key={c.id}
                  href={`/calls/${c.id}`}
                  className="p-3.5 flex items-center justify-between hover:bg-[#f7f9f6] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332] font-mono text-xs font-bold">
                      {c.callNumber.slice(-4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#142019] group-hover:text-[#059669] transition-colors">
                          {c.patient.name}
                        </span>
                        <span className="text-[10px] text-[#607264] font-mono">{c.patient.mrn}</span>
                        <Badge
                          variant={c.priority === "critical" ? "red" : c.priority === "high" ? "amber" : "teal"}
                          size="sm"
                        >
                          {c.priority}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#4a5f52] mt-0.5 max-w-lg truncate">
                        {c.intent} • {c.summary.overview}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-[#607264]">
                    <span>{c.duration}</span>
                    <ArrowRight className="h-4 w-4 text-[#8fa394] group-hover:text-[#059669] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <ReportsExporter />
          </div>
        </div>
      </div>
      </RoleGuard>
    </AppShell>
  );
}
