/**
 * CareOps AI - Real Backend Admin Operations & Governance Client
 * 
 * Direct API client for Express / MongoDB backend (/api/v1/admin).
 * Provides executive telemetry, RBAC roles governance, permissions catalog, and system rules.
 */

import { AdminOverviewData, SystemRuleConfig } from "@/features/admin/types";
import { getClientToken } from "../auth/sessionStore";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

export interface BackendHospitalOverview {
  totalUsers: number;
  totalPatients: number;
  activeDoctors: number;
  pendingTasks: number;
  insuranceClaims: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  activeDepartments: number;
  administratorName: string;
  facilityName: string;
  totalCalls: number;
  patientsHandled: number;
  overallDepartmentEfficiency: number;
  aiAccuracyMetric: number;
  activeStaffCount: number;
  ecosystemStability: "Optimal" | "Degraded" | "Elevated Load";
  timestamp: string;
}

export interface BackendRoleGovernance {
  role: string;
  userCount: number;
  permissionsCount: number;
  permissions: string[];
}

export interface BackendPermissionGovernance {
  permissionKey: string;
  permission: string;
  assignedRoles: string[];
}

export const apiAdminService = {
  /**
   * GET /api/v1/admin/overview
   */
  async getOverview(): Promise<BackendHospitalOverview> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/admin/overview`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch hospital overview (${res.status})`);
    }

    const payload = await res.json();
    return payload.data;
  },

  /**
   * GET /api/v1/admin/roles
   */
  async getRoles(): Promise<BackendRoleGovernance[]> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/admin/roles`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch roles governance (${res.status})`);
    }

    const payload = await res.json();
    return payload.data || [];
  },

  /**
   * GET /api/v1/admin/permissions
   */
  async getPermissions(): Promise<BackendPermissionGovernance[]> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/admin/permissions`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch permissions (${res.status})`);
    }

    const payload = await res.json();
    return payload.data || [];
  },

  /**
   * GET /api/v1/admin/rules
   */
  async getRules(): Promise<SystemRuleConfig[]> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/admin/rules`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch system rules (${res.status})`);
    }

    const payload = await res.json();
    return (payload.data || []).map((r: any) => ({
      id: r.id || r._id,
      category: r.category,
      title: r.title,
      description: r.description,
      enabled: r.enabled,
      value: r.value,
    }));
  },

  /**
   * PATCH /api/v1/admin/rules/:id
   */
  async updateRule(
    id: string,
    data: { enabled?: boolean; value?: string }
  ): Promise<SystemRuleConfig> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/admin/rules/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update rule (${res.status})`);
    }

    const payload = await res.json();
    const r = payload.data;
    return {
      id: r.id || r._id,
      category: r.category,
      title: r.title,
      description: r.description,
      enabled: r.enabled,
      value: r.value,
    };
  },
};
