import { CallPriority } from "./call";

export type TaskStatus = "pending" | "assigned" | "in-progress" | "completed";

export type DepartmentName =
  | "Reception"
  | "Insurance"
  | "Customer Support"
  | "Billing"
  | "Pharmacy"
  | "Emergency Triage"
  | "Clinical Team";

export interface SLAInfo {
  totalHours: number;
  remainingHours: number;
  deadlineTimestamp: string;
  isBreached: boolean;
  isWarning: boolean;
}

export interface ActionItem {
  id: string;
  callId: string;
  patientName: string;
  patientMrn: string;
  task: string;
  description: string;
  department: DepartmentName;
  priority: CallPriority;
  deadline: string;
  status: TaskStatus;
  assignedTo?: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  evidenceQuote: string;
  sla: SLAInfo;
  isEscalated: boolean;
  escalatedTo?: string;
  escalationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRoutingRule {
  intent: string;
  targetDepartment: DepartmentName;
  defaultPriority: CallPriority;
  slaTargetHours: number;
  autoAssignee?: string;
}
