import {
  Task,
  TaskStatus,
  Priority,
  EscalationLevel,
  Department,
  Employee,
  TaskNote,
  TaskTimeline,
  Call,
} from "@prisma/client";
import { SLAHealthStatus, SLAMetrics } from "../sla/sla.types";

export { SLAHealthStatus, SLAMetrics };

export interface CreateTaskDTO {
  callId: string;
  title: string;
  description?: string;
  departmentId: string;
  assignedEmployeeId?: string;
  priority?: Priority;
  deadlineAt?: Date;
}

export interface UpdateTaskStatusDTO {
  status: TaskStatus;
  reason?: string;
  actorId?: string;
}

export interface AssignTaskDTO {
  employeeId?: string;
  departmentId?: string;
  autoAssign?: boolean;
  actorId?: string;
}

export interface ChangePriorityDTO {
  priority: Priority;
  actorId?: string;
}

export interface CreateTaskNoteDTO {
  authorId: string;
  note: string;
}

export interface ListTasksQueryDTO {
  page: number;
  limit: number;
  departmentId?: string;
  assignedEmployeeId?: string;
  status?: TaskStatus;
  priority?: Priority;
  escalationLevel?: EscalationLevel;
  isOverdue?: boolean;
  slaStatus?: SLAHealthStatus;
}

export type TaskWithDetails = Task & {
  call: Call;
  department: Department;
  assignedEmployee: Employee | null;
  notes: TaskNote[];
  timelines: TaskTimeline[];
  sla?: SLAMetrics;
};
