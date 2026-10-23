/**
 * CareOps AI - Real Backend Task & Healthcare Workflow Management Client
 * 
 * Direct API client for Express / MongoDB backend (/api/v1/tasks).
 * Connects operational tasks, departmental queues, and staff delegation.
 */

import { ActionItem, DepartmentName, TaskStatus } from "@/shared/types/action";
import { getClientToken } from "../auth/sessionStore";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

export interface BackendTask {
  id: string;
  _id?: string;
  title: string;
  description: string;
  department: "RECEPTION" | "CLINICAL" | "INSURANCE" | "ADMINISTRATION";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "CREATED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  patientId?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    mrn?: string;
    department?: string;
  } | string;
  createdBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    department?: string;
  } | string;
  createdByType?: "USER" | "AI_SYSTEM" | "SYSTEM";
  assignedTo?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    department?: string;
    avatar?: string;
  } | string;
  dueDate?: string;
  aiMetadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function mapBackendDeptToFrontend(dept: string): DepartmentName {
  const normalized = (dept || "").toUpperCase();
  switch (normalized) {
    case "CLINICAL":
      return "Clinical Team";
    case "RECEPTION":
      return "Reception";
    case "INSURANCE":
      return "Insurance";
    case "ADMINISTRATION":
      return "Billing";
    default:
      return "Clinical Team";
  }
}

export function mapFrontendDeptToBackend(
  dept: string
): "RECEPTION" | "CLINICAL" | "INSURANCE" | "ADMINISTRATION" {
  const d = (dept || "").toLowerCase();
  if (d.includes("reception") || d.includes("front")) return "RECEPTION";
  if (d.includes("insurance") || d.includes("claim")) return "INSURANCE";
  if (d.includes("bill") || d.includes("admin")) return "ADMINISTRATION";
  return "CLINICAL";
}

export function mapBackendStatusToFrontend(status: string): TaskStatus {
  switch ((status || "").toUpperCase()) {
    case "CREATED":
      return "pending";
    case "ASSIGNED":
      return "assigned";
    case "IN_PROGRESS":
      return "in-progress";
    case "COMPLETED":
    case "CLOSED":
      return "completed";
    default:
      return "pending";
  }
}

export function mapFrontendStatusToBackend(
  status: string
): "CREATED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED" {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "CREATED";
    case "assigned":
      return "ASSIGNED";
    case "in-progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "closed":
      return "CLOSED";
    default:
      return "CREATED";
  }
}

export function mapBackendPriorityToFrontend(
  priority: string
): "low" | "medium" | "high" | "critical" {
  switch ((priority || "").toUpperCase()) {
    case "URGENT":
      return "critical";
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "LOW":
    default:
      return "low";
  }
}

export function mapFrontendPriorityToBackend(
  priority: string
): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  switch ((priority || "").toLowerCase()) {
    case "critical":
    case "urgent":
      return "URGENT";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
    default:
      return "LOW";
  }
}

export function mapBackendTaskToActionItem(t: BackendTask): ActionItem {
  const patientObj = typeof t.patientId === "object" ? t.patientId : null;
  const assigneeObj = typeof t.assignedTo === "object" ? t.assignedTo : null;

  const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : Date.now() + 24 * 3600 * 1000;
  const now = Date.now();
  const diffHours = Math.max(0, Math.round(((dueTime - now) / (1000 * 60 * 60)) * 10) / 10);

  return {
    id: t.id || t._id || `task-${Date.now()}`,
    callId: t.aiMetadata?.callId || "",
    patientName: patientObj?.name || (typeof t.patientId === "string" ? t.patientId : "General Triage"),
    patientMrn: patientObj?.mrn || "MRN-884920",
    task: t.title,
    description: t.description || "",
    department: mapBackendDeptToFrontend(t.department),
    priority: mapBackendPriorityToFrontend(t.priority),
    deadline: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Next 24h",
    status: mapBackendStatusToFrontend(t.status),
    assignedTo: assigneeObj
      ? {
          id: assigneeObj.id || assigneeObj._id || "",
          name: assigneeObj.name || "Assigned Clinician",
          avatar:
            assigneeObj.avatar ||
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
          role: assigneeObj.role || "Staff",
        }
      : undefined,
    evidenceQuote: t.aiMetadata?.evidenceQuote || t.description || "",
    sla: {
      totalHours: 24,
      remainingHours: diffHours,
      deadlineTimestamp: t.dueDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      isBreached: diffHours === 0 && t.status !== "COMPLETED" && t.status !== "CLOSED",
      isWarning: diffHours > 0 && diffHours < 4,
    },
    isEscalated: t.priority === "URGENT",
    escalatedTo: t.priority === "URGENT" ? "Operations Executive" : undefined,
    escalationReason: t.priority === "URGENT" ? "Critical Priority SLA" : undefined,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  };
}

export const apiTaskService = {
  /**
   * GET /api/v1/tasks
   * Role-scoped list of tasks from MongoDB
   */
  async getTasks(filters?: {
    status?: string;
    department?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
  }): Promise<ActionItem[]> {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const q = new URLSearchParams();
      if (filters?.status) q.append("status", filters.status);
      if (filters?.department) q.append("department", filters.department);
      if (filters?.priority) q.append("priority", filters.priority);
      if (filters?.assignedTo) q.append("assignedTo", filters.assignedTo);

      const res = await fetch(`${BACKEND_BASE_URL}/tasks?${q.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: ${res.status}`);
      }

      const data = await res.json();
      const rawTasks: BackendTask[] = data.tasks || [];

      let mapped = rawTasks.map(mapBackendTaskToActionItem);

      if (filters?.search) {
        const query = filters.search.toLowerCase();
        mapped = mapped.filter(
          (m) =>
            m.task.toLowerCase().includes(query) ||
            m.patientName.toLowerCase().includes(query) ||
            m.department.toLowerCase().includes(query)
        );
      }

      return mapped;
    } catch (err: any) {
      console.warn("[apiTaskService] Error fetching tasks:", err.message);
      return [];
    }
  },

  /**
   * GET /api/v1/tasks/:id
   */
  async getTaskById(id: string): Promise<ActionItem | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/tasks/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      return mapBackendTaskToActionItem(data.task);
    } catch (err: any) {
      console.warn("[apiTaskService] Error fetching task by ID:", err.message);
      return null;
    }
  },

  /**
   * POST /api/v1/tasks
   * Create an operational task in MongoDB
   */
  async createTask(payload: {
    title: string;
    description?: string;
    department?: string;
    priority?: string;
    patientId?: string;
    assignedTo?: string;
    dueDate?: string;
    aiMetadata?: Record<string, any>;
  }): Promise<ActionItem | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const dept = mapFrontendDeptToBackend(payload.department || "Clinical");
    const prio = mapFrontendPriorityToBackend(payload.priority || "MEDIUM");

    const body: Record<string, any> = {
      title: payload.title,
      description: payload.description || payload.title,
      department: dept,
      priority: prio,
      dueDate: payload.dueDate,
      aiMetadata: payload.aiMetadata,
    };

    if (payload.patientId) body.patientId = payload.patientId;
    if (payload.assignedTo) body.assignedTo = payload.assignedTo;

    const res = await fetch(`${BACKEND_BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create task: ${res.status}`);
    }

    const data = await res.json();
    return mapBackendTaskToActionItem(data.task);
  },

  /**
   * POST /api/v1/tasks/from-call
   * Automatically persists and intelligently assigns action tasks from live/simulated call intelligence.
   */
  async createTasksFromCall(callData: {
    callId: string;
    transcript: string;
    summary?: string;
    intent?: string;
    priority?: string;
    actions?: any[];
    patientName?: string;
    patientMrn?: string;
    doctorName?: string;
  }): Promise<ActionItem[]> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/tasks/from-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(callData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create tasks from call: ${res.status}`);
    }

    const data = await res.json();
    return (data.tasks || []).map(mapBackendTaskToActionItem);
  },

  /**
   * PATCH /api/v1/tasks/:id/assign
   */
  async assignTask(
    taskId: string,
    assignedToUserId: string
  ): Promise<ActionItem | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const res = await fetch(`${BACKEND_BASE_URL}/tasks/${taskId}/assign`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assignedTo: assignedToUserId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to assign task: ${res.status}`);
    }

    const data = await res.json();
    return mapBackendTaskToActionItem(data.task);
  },

  /**
   * PATCH /api/v1/tasks/:id/status
   */
  async updateTaskStatus(
    taskId: string,
    targetStatus: TaskStatus | string
  ): Promise<ActionItem | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const backendStatus = mapFrontendStatusToBackend(targetStatus);

    const res = await fetch(`${BACKEND_BASE_URL}/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: backendStatus }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update status: ${res.status}`);
    }

    const data = await res.json();
    return mapBackendTaskToActionItem(data.task);
  },

  /**
   * DELETE /api/v1/tasks/:id
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const res = await fetch(`${BACKEND_BASE_URL}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.ok;
  },

  /**
   * POST /api/v1/tasks/from-call
   * Automatically creates and routes operational tasks extracted from telephony or call simulation.
   */
  async createTasksFromCall(params: {
    callId?: string;
    transcript?: string;
    summary?: string;
    intent?: string;
    priority?: string;
    actions?: Array<{
      task?: string;
      title?: string;
      department?: string;
      priority?: string;
      description?: string;
      evidence_quote?: string;
    }>;
    patientName?: string;
    patientMrn?: string;
    patientEmail?: string;
    doctorName?: string;
  }): Promise<ActionItem[]> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/tasks/from-call`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create tasks from call: ${res.status}`);
    }

    const data = await res.json();
    const tasks: BackendTask[] = data.tasks || [];
    return tasks.map(mapBackendTaskToActionItem);
  },
};
