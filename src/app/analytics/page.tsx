"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, CheckCircle, Clock, Flame, ShieldCheck } from "lucide-react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { AnalyticsCharts } from "@/features/platform/components/AnalyticsCharts";
import { ReportsExporter } from "@/features/platform/components/ReportsExporter";
import { StatCard } from "@/shared/components/common/StatCard";
import { apiAnalyticsService } from "@/features/platform/analytics/apiAnalyticsService";
import {
  AnalyticsSummary,
  CallVolumePoint,
  CategoryDistribution,
  DepartmentWorkload,
  ResolutionTimeMetric,
} from "@/shared/types/analytics";
import { Badge } from "@/shared/components/ui/Badge";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [volumeTrends, setVolumeTrends] = useState<CallVolumePoint[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [workloads, setWorkloads] = useState<DepartmentWorkload[]>([]);
  const [resolutionMetrics, setResolutionMetrics] = useState<ResolutionTimeMetric[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const [sum, trends, cats, load, res] = await Promise.all([
      apiAnalyticsService.getSummary(),
      apiAnalyticsService.getVolumeTrends(),
      apiAnalyticsService.getCategoryDistribution(),
      apiAnalyticsService.getDepartmentWorkloads(),
      apiAnalyticsService.getResolutionTimeMetrics(),
    ]);

    setSummary(sum);
    setVolumeTrends(trends);
    setCategories(cats);
    setWorkloads(load);
    setResolutionMetrics(res);
  };

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Admin", "Manager"]} moduleName="Operational Analytics & Reporting">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e2e8e0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1b4332] font-mono">
                Operational Analytics & Metrics
              </h1>
              <Badge variant="emerald" size="sm">
                Executive Reporting
              </Badge>
            </div>
            <p className="text-xs text-[#607264] mt-1">
              Comprehensive telemetry tracking call ingestion, conversion rates, and department throughput
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8e0] text-[#142019] shadow-2xs">
              Extraction Accuracy: <strong className="text-[#059669]">99.2%</strong>
            </span>
          </div>
        </div>

        {/* Top Metric Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Calls Processed"
              value={summary.totalCalls.toLocaleString()}
              changePercent={summary.callsChangePercent}
              subtitle="24h volume"
              icon={<BarChart3 className="h-5 w-5" />}
              variant="teal"
            />
            <StatCard
              title="Task Resolution Velocity"
              value={summary.completedTasks.toLocaleString()}
              changePercent={summary.tasksChangePercent}
              subtitle="dispatched actions"
              icon={<CheckCircle className="h-5 w-5" />}
              variant="emerald"
            />
            <StatCard
              title="Overall SLA Compliance"
              value={`${summary.overallSLACompliance}%`}
              subtitle="across all departments"
              icon={<Clock className="h-5 w-5" />}
              variant="amber"
            />
            <StatCard
              title="Avg Mean Resolution"
              value={`${summary.avgResolutionHours} hrs`}
              subtitle="from call to done"
              icon={<TrendingUp className="h-5 w-5" />}
              variant="default"
            />
          </div>
        )}

        {/* Main Charts */}
        {volumeTrends.length > 0 && (
          <AnalyticsCharts
            volumeTrends={volumeTrends}
            categories={categories}
            departmentWorkloads={workloads}
            resolutionMetrics={resolutionMetrics}
          />
        )}

        {/* Reports Download Section */}
        <ReportsExporter />
      </div>
      </RoleGuard>
    </AppShell>
  );
}
