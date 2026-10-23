import { Priority, TaskStatus, EscalationLevel } from "@prisma/client";

export interface AnalyticsOverview {
  totalCalls: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  breachedTasks: number;
  slaComplianceRate: number; // Percentage (0 - 100)
  onTimeCompletedTasks: number;
  statusBreakdown: Record<TaskStatus, number>;
  priorityBreakdown: Record<Priority, number>;
  escalationSummary: {
    level0Normal: number;
    level1Warning: number;
    level2Critical: number;
    totalEscalated: number;
  };
  generatedAt: string;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  managerId: string | null;
  managerName: string | null;
  totalTasks: number;
  activeTasks: number;
  breachedTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  averageCompletionTimeMinutes: number;
  slaComplianceRate: number; // Percentage (0 - 100)
}

export interface StaffWorkload {
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  activeTasksCount: number;
  completedTasksCount: number;
}

export interface IntentFrequency {
  intent: string;
  count: number;
  percentage: number;
}

export interface EscalationMetrics {
  level0Count: number;
  level1Count: number;
  level2Count: number;
  totalEscalated: number;
  activeTasksTotal: number;
  escalationRatePercentage: number;
}

export interface CompleteAnalyticsDashboard {
  overview: AnalyticsOverview;
  departments: DepartmentPerformance[];
  staff: StaffWorkload[];
  intents: IntentFrequency[];
  escalations: EscalationMetrics;
  generatedAt: string;
}
