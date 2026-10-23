export interface CallVolumePoint {
  time: string;
  totalCalls: number;
  criticalCalls: number;
  resolvedActions: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DepartmentWorkload {
  department: string;
  activeTasks: number;
  pendingReview: number;
  completedToday: number;
  slaBreachRate: number; // percentage
  avgResolutionHours: number;
}

export interface ResolutionTimeMetric {
  department: string;
  targetHours: number;
  actualHours: number;
}

export interface AnalyticsSummary {
  totalCalls: number;
  callsChangePercent: number;
  completedTasks: number;
  tasksChangePercent: number;
  pendingActions: number;
  criticalCases: number;
  criticalChangePercent: number;
  avgResolutionHours: number;
  overallSLACompliance: number; // e.g. 96.4%
  automatedExtractionAccuracy: number; // e.g. 99.1%
}
