"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CallVolumePoint,
  CategoryDistribution,
  DepartmentWorkload,
  ResolutionTimeMetric,
} from "@/shared/types/analytics";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface AnalyticsChartsProps {
  volumeTrends: CallVolumePoint[];
  categories: CategoryDistribution[];
  departmentWorkloads: DepartmentWorkload[];
  resolutionMetrics: ResolutionTimeMetric[];
}

const customTooltipStyle = {
  backgroundColor: "#ffffff",
  borderColor: "#e2e8e0",
  borderRadius: "12px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
  color: "#142019",
  fontSize: "12px",
};

export function AnalyticsCharts({
  volumeTrends,
  categories,
  departmentWorkloads,
  resolutionMetrics,
}: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      {/* Top Row: Call Volume Trend & Issue Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Call Volume Trend AreaChart */}
        <Card className="lg:col-span-8 p-5">
          <CardHeader>
            <div>
              <CardTitle>Inbound Telephony Volume & Resolution Velocity</CardTitle>
              <p className="text-xs text-[#607264] mt-0.5">
                Hourly call arrivals vs automated task completion stream
              </p>
            </div>
            <Badge variant="emerald" size="sm">
              Live Stream
            </Badge>
          </CardHeader>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeTrends}>
                <defs>
                  <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                <XAxis dataKey="time" stroke="#607264" fontSize={11} />
                <YAxis stroke="#607264" fontSize={11} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="totalCalls"
                  name="Inbound Calls"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#callGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="resolvedActions"
                  name="Resolved Actions"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#resolvedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Issue Categories Donut / Pie */}
        <Card className="lg:col-span-4 p-5">
          <CardHeader>
            <div>
              <CardTitle>Clinical Intent Distribution</CardTitle>
              <p className="text-xs text-[#607264] mt-0.5">
                Breakdown of patient conversation intents
              </p>
            </div>
          </CardHeader>

          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#e2e8e0] text-[11px]">
            {categories.slice(0, 4).map((c) => (
              <div key={c.category} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-[#142019] truncate">{c.category}</span>
                <span className="text-[#607264] font-mono">({c.percentage}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row: Department Workload & Resolution Times */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Workload BarChart */}
        <Card className="lg:col-span-6 p-5">
          <CardHeader>
            <div>
              <CardTitle>Department Workload & Active Task Queue</CardTitle>
              <p className="text-xs text-[#607264] mt-0.5">
                Active tasks distributed across operational units
              </p>
            </div>
            <Badge variant="teal" size="sm">
              Live Capacities
            </Badge>
          </CardHeader>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentWorkloads}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                <XAxis dataKey="department" stroke="#607264" fontSize={11} />
                <YAxis stroke="#607264" fontSize={11} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar
                  dataKey="activeTasks"
                  name="Active In-Flight"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="completedToday"
                  name="Completed Today"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Resolution Time Comparison */}
        <Card className="lg:col-span-6 p-5">
          <CardHeader>
            <div>
              <CardTitle>Resolution Time vs SLA Target (Hours)</CardTitle>
              <p className="text-xs text-[#607264] mt-0.5">
                Actual operational hours to resolve vs SLA mandate
              </p>
            </div>
            <Badge variant="emerald" size="sm">
              All Under SLA Target
            </Badge>
          </CardHeader>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                <XAxis dataKey="department" stroke="#607264" fontSize={11} />
                <YAxis stroke="#607264" fontSize={11} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar
                  dataKey="actualHours"
                  name="Actual Mean (Hrs)"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="targetHours"
                  name="SLA Threshold (Hrs)"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
