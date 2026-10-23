import { EscalationLevel, Priority, Task, TaskStatus } from "@prisma/client";
import { SLAMetrics } from "../sla/sla.types";
import { TaskWithDetails } from "../tasks/tasks.types";

export type EscalationLevelNumber = 0 | 1 | 2;

export interface EscalatedTaskItem extends Task {
  sla: SLAMetrics;
  departmentName?: string;
  assignedEmployeeName?: string | null;
}

export interface EscalationRunResult {
  scannedCount: number;
  escalatedToLevel1Count: number;
  escalatedToLevel2Count: number;
  escalatedTaskIds: string[];
  errors: Array<{ taskId: string; error: string }>;
}

export interface ManualEscalateDTO {
  taskId: string;
  reason: string;
  triggeredBy: string;
}

export interface EscalatedTasksResponse {
  data: Array<TaskWithDetails & { sla: SLAMetrics }>;
  grouped: {
    level1: Array<TaskWithDetails & { sla: SLAMetrics }>;
    level2: Array<TaskWithDetails & { sla: SLAMetrics }>;
  };
  meta: {
    total: number;
    level1Count: number;
    level2Count: number;
  };
}
