/**
 * CareOps AI - Real Backend User Management Client
 * 
 * Direct API client for the Express / MongoDB backend (/api/v1/users).
 * Drop-in replacement for mockUserService.
 */

import { User, UserRole } from "@/shared/types/user";
import { mapBackendRoleToFrontend, mapFrontendRoleToBackend } from "../auth/apiAuthService";
import { getClientToken } from "../auth/sessionStore";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

function normalizeUserFromApi(apiUser: any): User {
  const feRole = mapBackendRoleToFrontend(apiUser.role);
  return {
    id: apiUser.id || apiUser._id,
    name: apiUser.name,
    email: apiUser.email,
    role: feRole,
    department: apiUser.department || "General",
    status: (apiUser.status || "active").toLowerCase() as any,
    avatar:
      apiUser.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    phone: apiUser.phone || "",
    assignedTasksCount: apiUser.assignedTasksCount || 0,
    completedTasksCount: apiUser.completedTasksCount || 0,
    avgResolutionMinutes: apiUser.avgResolutionMinutes || 25,
    lastActive: "Active",
  };
}

export const apiUserService = {
  /**
   * GET /api/v1/users
   * Retrieve hospital users with optional role, department, status, and search filters.
   */
  async getUsers(filters?: {
    role?: string;
    department?: string;
    status?: string;
    search?: string;
  }): Promise<User[]> {
    const token = getAuthToken();

    if (!token) {
      return [];
    }

    try {
      const queryParams = new URLSearchParams();
      if (filters?.role) queryParams.append("role", filters.role);
      if (filters?.department) queryParams.append("department", filters.department);
      if (filters?.status) queryParams.append("status", filters.status);
      if (filters?.search) queryParams.append("search", filters.search);

      const url = `${BACKEND_BASE_URL}/users${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          return data.users.map(normalizeUserFromApi);
        }
      }
    } catch (err: any) {
      console.error("[apiUserService] Backend user service request failed:", err.message);
    }

    return [];
  },

  /**
   * GET /api/v1/users/:id
   * Retrieve single user details.
   */
  async getUserById(id: string): Promise<User | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          return normalizeUserFromApi(data.user);
        }
      }
    } catch (err: any) {
      console.error(`[apiUserService] Failed to get user ${id}:`, err.message);
    }

    return null;
  },

  /**
   * POST /api/v1/users
   * Create a new hospital user account (Admin only).
   */
  async createUser(newUser: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    department?: string;
    phone?: string;
    avatar?: string;
    status?: string;
  }): Promise<User> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to create users.");

    const payload = {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password || "password123",
      role: mapFrontendRoleToBackend(newUser.role),
      department: newUser.department || "General",
      phone: newUser.phone || "",
      avatar: newUser.avatar || "",
      status: newUser.status || "ACTIVE",
    };

    const res = await fetch(`${BACKEND_BASE_URL}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.message || "Failed to create user on backend.");
    }

    return normalizeUserFromApi(data.user);
  },

  // Backwards-compatible alias for existing frontend callers
  async addUser(newUser: any): Promise<User> {
    return this.createUser(newUser);
  },

  /**
   * PATCH /api/v1/users/:id
   * Update editable profile fields (Admin only).
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to update user.");

    const payload: any = { ...updates };
    if (updates.role) {
      payload.role = mapFrontendRoleToBackend(updates.role as UserRole);
    }

    const res = await fetch(`${BACKEND_BASE_URL}/users/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.message || "Failed to update user on backend.");
    }

    return normalizeUserFromApi(data.user);
  },

  /**
   * PATCH /api/v1/users/:id/status
   * Update status between ACTIVE, INACTIVE, and SUSPENDED.
   */
  async changeStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<User | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to change user status.");

    const res = await fetch(`${BACKEND_BASE_URL}/users/${id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.message || "Failed to update user status.");
    }

    return normalizeUserFromApi(data.user);
  },

  /**
   * DELETE /api/v1/users/:id
   * Soft deactivates account on backend (status = INACTIVE).
   */
  async deleteUser(id: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to delete user.");

    const res = await fetch(`${BACKEND_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to delete user on backend.");
    }

    return true;
  },
};
