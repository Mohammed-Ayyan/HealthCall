import { Priority } from "@prisma/client";

export type TaskPriority = Priority;
export { Priority as TaskPriorityEnum };

export type SLAHealthStatus =
  | "ON_TRACK"
  | "NEAR_BREACH"
  | "BREACHED"
  | "COMPLETED_ON_TIME"
  | "COMPLETED_BREACHED";

export interface SLAMetrics {
  createdAt: string;
  assignedAt: string | null;
  deadlineAt: string;
  completedAt: string | null;
  healthStatus: SLAHealthStatus;
  remainingMinutes: number;
  elapsedMinutes: number;
}
