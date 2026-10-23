import { TaskTimeline } from "@prisma/client";

/**
 * Standard audit event types across the Healthcare Workflow Engine.
 */
export const AuditEventType = {
  CALL_LOGGED: "CALL_LOGGED",
  TASK_CREATED: "TASK_CREATED",
  TASK_ROUTED: "TASK_ROUTED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_TRANSFERRED: "TASK_TRANSFERRED",
  STATUS_CHANGED: "STATUS_CHANGED",
  PRIORITY_UPDATED: "PRIORITY_UPDATED",
  NOTE_ADDED: "NOTE_ADDED",
  SLA_BREACHED: "SLA_BREACHED",
  ESCALATED_LEVEL_1: "ESCALATED_LEVEL_1",
  ESCALATED_LEVEL_2: "ESCALATED_LEVEL_2",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_CANCELLED: "TASK_CANCELLED",
} as const;

export type AuditEventTypeEnum = (typeof AuditEventType)[keyof typeof AuditEventType];

/**
 * Options payload when recording a timeline audit event.
 */
export interface RecordEventOptions {
  taskId: string;
  eventType: AuditEventTypeEnum | string;
  performedBy?: string | null;
  message?: string;
  metadata?: Record<string, any>;
  throwOnError?: boolean;
}

/**
 * Query filter for retrieving historical timeline entries.
 */
export interface TimelineQueryFilter {
  taskId?: string;
  actorId?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated timeline query response.
 */
export interface PaginatedTimelineResponse {
  data: TaskTimeline[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
