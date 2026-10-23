import { ActionItem, TaskStatus, DepartmentName, DepartmentRoutingRule } from "@/shared/types/action";
import { mockCallsList } from "./mockCallsService";

// Real tasks are dynamically loaded from MongoDB /api/v1/tasks
export const mockActionItems: ActionItem[] = [];

export const mockDepartmentRoutingRules: DepartmentRoutingRule[] = [
  {
    intent: "Insurance Query",
    targetDepartment: "Insurance",
    defaultPriority: "high",
    slaTargetHours: 4,
    autoAssignee: "Marcus Vance",
  },
  {
    intent: "Appointment Request",
    targetDepartment: "Reception",
    defaultPriority: "medium",
    slaTargetHours: 8,
    autoAssignee: "Sarah Jenkins",
  },
  {
    intent: "Complaint",
    targetDepartment: "Customer Support",
    defaultPriority: "high",
    slaTargetHours: 4,
    autoAssignee: "Lisa Ray",
  },
  {
    intent: "Billing Issue",
    targetDepartment: "Billing",
    defaultPriority: "high",
    slaTargetHours: 3,
    autoAssignee: "David Ross",
  },
  {
    intent: "Medicine Refill",
    targetDepartment: "Pharmacy",
    defaultPriority: "medium",
    slaTargetHours: 6,
    autoAssignee: "Robert Sterling",
  },
  {
    intent: "Emergency Concern",
    targetDepartment: "Emergency Triage",
    defaultPriority: "critical",
    slaTargetHours: 0.2,
    autoAssignee: "Emergency Duty Desk",
  },
];

import { apiTaskService } from "@/features/platform/tasks/apiTaskService";

/**
 * Healthcare Workflow & Operational Task Service
 * Backed by live MongoDB backend (/api/v1/tasks).
 */
export const mockTasksService = {
  async getTasks(filters?: {
    status?: TaskStatus;
    department?: DepartmentName;
    priority?: string;
    search?: string;
  }): Promise<ActionItem[]> {
    try {
      const realTasks = await apiTaskService.getTasks(filters as any);
      if (Array.isArray(realTasks)) {
        return realTasks;
      }
    } catch (e: any) {
      console.warn("[mockTasksService] Live tasks query failed:", e.message);
    }
    return [];
  },

  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<ActionItem | null> {
    try {
      const updated = await apiTaskService.updateTaskStatus(taskId, newStatus);
      if (updated) return updated;
    } catch (e: any) {
      console.warn("[mockTasksService] Live status update failed:", e.message);
    }
    return null;
  },

  async assignTask(
    taskId: string,
    user: { id: string; name: string; avatar: string; role: string }
  ): Promise<ActionItem | null> {
    try {
      const updated = await apiTaskService.assignTask(taskId, user.id);
      if (updated) return updated;
    } catch (e: any) {
      console.warn("[mockTasksService] Live assignment failed:", e.message);
    }
    return null;
  },

  async escalateTask(taskId: string, reason: string): Promise<ActionItem | null> {
    try {
      const updated = await apiTaskService.updateTaskStatus(taskId, "IN_PROGRESS");
      if (updated) {
        updated.isEscalated = true;
        updated.escalatedTo = "Operations Executive / Manager";
        updated.escalationReason = reason;
        return updated;
      }
    } catch (e: any) {
      console.warn("[mockTasksService] Live escalate failed:", e.message);
    }
    return null;
  },

  async getRoutingRules(): Promise<DepartmentRoutingRule[]> {
    return mockDepartmentRoutingRules;
  },

  async getOverdueAndEscalated(): Promise<ActionItem[]> {
    try {
      const allTasks = await this.getTasks();
      return allTasks.filter((i) => i.isEscalated || i.sla?.isBreached || i.sla?.isWarning);
    } catch {
      return [];
    }
  },
};
