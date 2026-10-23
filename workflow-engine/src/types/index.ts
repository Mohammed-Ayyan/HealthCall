import {
  Call,
  Department,
  Employee,
  Task,
  TaskNote,
  TaskTimeline,
  Priority,
  Sentiment,
  EmployeeRole,
  TaskStatus,
  EscalationLevel,
  Prisma,
} from "@prisma/client";

// Re-export Prisma model types and enums
export {
  Call,
  Department,
  Employee,
  Task,
  TaskNote,
  TaskTimeline,
  Priority,
  Sentiment,
  EmployeeRole,
  TaskStatus,
  EscalationLevel,
  Prisma,
};

// Standard Timeline Event Types
export const TimelineEventType = {
  CALL_RECEIVED: "CALL_RECEIVED",
  AI_PROCESSED: "AI_PROCESSED",
  TASK_CREATED: "TASK_CREATED",
  ASSIGNED: "ASSIGNED",
  STATUS_CHANGED: "STATUS_CHANGED",
  ESCALATED: "ESCALATED",
  NOTE_ADDED: "NOTE_ADDED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type TimelineEventType =
  (typeof TimelineEventType)[keyof typeof TimelineEventType];

// Extended Model Types with Relations
export type DepartmentWithDetails = Department & {
  manager: Employee | null;
  employees?: Employee[];
  _count?: {
    employees: number;
    tasks: number;
  };
};

export type EmployeeWithDepartment = Employee & {
  department: Department;
  managedDepartments?: Department[];
};

export type TaskWithDetails = Task & {
  call: Call;
  department: Department;
  assignedEmployee: Employee | null;
  notes: (TaskNote & { author: Employee | null })[];
  timelines: TaskTimeline[];
};

export type CallWithTasks = Call & {
  tasks: Task[];
};

// Data Transfer Object Interfaces
export interface CreateCallInput {
  patientName: string;
  patientPhone: string;
  patientMrn?: string;
  transcript: string;
  summary: string;
  detectedIntent: string;
  priority: Priority;
  sentiment: Sentiment;
  callTimestamp: Date | string;
}

export interface CreateDepartmentInput {
  id: string;
  name: string;
  managerId?: string;
}

export interface CreateEmployeeInput {
  departmentId: string;
  fullName: string;
  email: string;
  role: EmployeeRole;
  isActive?: boolean;
}

export interface CreateTaskInput {
  callId: string;
  title: string;
  description?: string;
  departmentId: string;
  assignedEmployeeId?: string;
  priority?: Priority;
  deadlineAt?: Date | string;
}

export interface CreateTaskTimelineInput {
  taskId: string;
  actorId?: string;
  eventType: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export * from "../modules/audit/audit.types";
export * from "../modules/analytics/analytics.types";

