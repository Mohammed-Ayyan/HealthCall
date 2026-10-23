/**
 * CareOps AI - Real Backend Department Management Client
 * 
 * Direct API client for Express / MongoDB backend (/api/v1/departments).
 * Provides full department lifecycle operations and real-time division metrics.
 */

import { HospitalDepartment } from "@/features/admin/types";
import { getClientToken } from "../auth/sessionStore";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

export interface BackendDepartment {
  id: string;
  _id?: string;
  name: string;
  description: string;
  managerId: string | null;
  leadName: string;
  status: "ACTIVE" | "INACTIVE" | "Fully Staffed" | "High Demand" | "Surge Mode";
  staffCount: number;
  openCommitmentsCount: number;
  currentWorkloadScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export const apiDepartmentService = {
  /**
   * GET /api/v1/departments
   */
  async getDepartments(params?: { status?: string; search?: string }): Promise<HospitalDepartment[]> {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${BACKEND_BASE_URL}/departments${qs}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch departments (${res.status})`);
    }

    const payload = await res.json();
    return (payload.data || []).map((d: BackendDepartment) => ({
      id: d.id || d._id || "",
      name: d.name,
      leadName: d.leadName || "Unassigned Lead",
      staffCount: d.staffCount || 0,
      currentWorkloadScore: d.currentWorkloadScore || 75,
      status: d.status === "ACTIVE" ? "Fully Staffed" : d.status,
      openCommitmentsCount: d.openCommitmentsCount || 0,
    }));
  },

  /**
   * POST /api/v1/departments
   */
  async createDepartment(data: {
    name: string;
    description?: string;
    managerId?: string;
    status?: string;
  }): Promise<HospitalDepartment> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/departments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create department (${res.status})`);
    }

    const payload = await res.json();
    const d = payload.data;
    return {
      id: d.id || d._id,
      name: d.name,
      leadName: d.leadName || "Unassigned Lead",
      staffCount: d.staffCount || 0,
      currentWorkloadScore: d.currentWorkloadScore || 75,
      status: d.status === "ACTIVE" ? "Fully Staffed" : d.status,
      openCommitmentsCount: d.openCommitmentsCount || 0,
    };
  },

  /**
   * PATCH /api/v1/departments/:id
   */
  async updateDepartment(
    id: string,
    data: {
      name?: string;
      description?: string;
      managerId?: string | null;
      status?: string;
    }
  ): Promise<HospitalDepartment> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/departments/${id}`, {
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
      throw new Error(err.message || `Failed to update department (${res.status})`);
    }

    const payload = await res.json();
    const d = payload.data;
    return {
      id: d.id || d._id,
      name: d.name,
      leadName: d.leadName || "Unassigned Lead",
      staffCount: d.staffCount || 0,
      currentWorkloadScore: d.currentWorkloadScore || 75,
      status: d.status === "ACTIVE" ? "Fully Staffed" : d.status,
      openCommitmentsCount: d.openCommitmentsCount || 0,
    };
  },

  /**
   * DELETE /api/v1/departments/:id
   */
  async deleteDepartment(id: string): Promise<boolean> {
    const token = getAuthToken();
    const res = await fetch(`${BACKEND_BASE_URL}/departments/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to delete department (${res.status})`);
    }

    return true;
  },
};
