export type AuditStage =
  | "CALL_RECEIVED"
  | "AUDIO_PROCESSED"
  | "AI_ANALYSIS_COMPLETED"
  | "TASK_EXTRACTED"
  | "ROUTED_TO_DEPARTMENT"
  | "STAFF_ASSIGNED"
  | "SLA_MONITORED"
  | "ESCALATED"
  | "COMPLETED";

export interface AuditEvent {
  id: string;
  callId?: string;
  taskId?: string;
  stage: AuditStage;
  title: string;
  description: string;
  timestamp: string;
  actor: "System AI" | "CareOps Engine" | "Staff User" | "Manager";
  metadata?: Record<string, string | number | boolean>;
}
