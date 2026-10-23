import { Priority, Sentiment } from "@prisma/client";

export interface RoutingEvaluationInput {
  intent: string;
  priority?: Priority | string;
  sentiment?: Sentiment | string;
}

export interface RoutingEvaluationResult {
  matched_intent: string;
  department_id: string;
  department_name: string;
  default_priority: string;
  sla_hours: number;
}

export interface DepartmentRoutingRule {
  departmentId: string;
  departmentName: string;
  defaultPriority: Priority;
  slaHours: number;
  patterns: (string | RegExp)[];
}
