/**
 * CareOps AI - Real Backend Authentication Client
 * 
 * Direct API client for the Express / MongoDB backend (/api/v1/auth).
 * Designed with dual cookie + localStorage persistence for zero hydration mismatches.
 */

import { User, UserRole } from "@/shared/types/user";
import { getRoleDashboard } from "./rolePermissions";
import { AuthResponse, LoginCredentials } from "./authService";
import {
  saveSession,
  clearSession,
  getClientSession,
  getClientToken,
} from "./sessionStore";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

/**
 * Normalizes backend role format (e.g., 'PATIENT', 'DOCTOR')
 * to frontend UserRole format ('Patient', 'Doctor', etc.)
 */
export function mapBackendRoleToFrontend(backendRole: string): UserRole {
  switch (backendRole.toUpperCase()) {
    case "PATIENT":
      return "Patient";
    case "DOCTOR":
      return "Doctor";
    case "RECEPTIONIST":
      return "Receptionist";
    case "INSURANCE_EMPLOYEE":
      return "Insurance Employee";
    case "DEPARTMENT_MANAGER":
      return "Manager";
    case "ADMIN":
      return "Admin";
    default:
      return "Patient";
  }
}

/**
 * Normalizes frontend UserRole ('Patient', 'Doctor', etc.)
 * to backend canonical role ('PATIENT', 'DOCTOR', etc.)
 */
export function mapFrontendRoleToBackend(frontendRole: UserRole): string {
  switch (frontendRole) {
    case "Patient":
      return "PATIENT";
    case "Doctor":
      return "DOCTOR";
    case "Receptionist":
      return "RECEPTIONIST";
    case "Insurance Employee":
      return "INSURANCE_EMPLOYEE";
    case "Manager":
      return "DEPARTMENT_MANAGER";
    case "Admin":
      return "ADMIN";
    default:
      return "PATIENT";
  }
}

export const apiAuthService = {
  getToken(): string | null {
    return getClientToken();
  },

  getCurrentUser(): User {
    const stored = getClientSession();
    if (stored) return stored;
    return {
      id: "",
      name: "Guest",
      email: "",
      role: "Patient",
      department: "",
      status: "active",
      avatar: "",
      phone: "",
      lastActive: "Never",
    };
  },

  getCurrentRole(): UserRole {
    return this.getCurrentUser().role;
  },

  /**
   * Real Backend Registration: POST /api/v1/auth/register
   */
  async register(params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const payload = {
      name: params.name,
      email: params.email,
      password: params.password,
      role: mapFrontendRoleToBackend(params.role),
      department: params.department || "",
      phone: params.phone || "",
    };

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Registration failed");
      }

      const feRole = mapBackendRoleToFrontend(data.user.role);
      const user: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: feRole,
        department: data.user.department || "General Hospital",
        status: "active",
        avatar: data.user.avatar || "",
        phone: data.user.phone || params.phone || "",
        lastActive: "Just now",
      };

      saveSession(user, data.token);

      return {
        success: true,
        role: feRole,
        user,
        token: data.token,
        redirectTo: getRoleDashboard(feRole),
      };
    } catch (err: any) {
      throw new Error(err.message || "Registration failed");
    }
  },

  /**
   * Real Backend Login: POST /api/v1/auth/login
   */
  async login(creds: LoginCredentials): Promise<AuthResponse> {
    if (!creds.email || !creds.password) {
      throw new Error("Please enter both email and password.");
    }

    const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: creds.email.trim(),
        password: creds.password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || "Invalid email or password");
    }

    const feRole = mapBackendRoleToFrontend(data.user.role);
    const user: User = {
      id: data.user.id || data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: feRole,
      department: data.user.department || "General Hospital",
      status: "active",
      avatar: data.user.avatar || "",
      phone: data.user.phone || "",
      lastActive: "Now",
    };

    saveSession(user, data.token);

    return {
      success: true,
      role: feRole,
      user,
      token: data.token,
      redirectTo: getRoleDashboard(feRole),
    };
  },

  /**
   * Real Backend Current User: GET /api/v1/auth/me
   */
  async fetchCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return this.getCurrentUser();

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.id) {
        const feRole = mapBackendRoleToFrontend(data.role);
        const user: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: feRole,
          department: data.department || "",
          status: "active",
          avatar: data.avatar || "",
          phone: data.phone || "",
          lastActive: "Now",
        };
        saveSession(user, token);
        return user;
      }
    } catch {
      console.warn("Could not reach /api/v1/auth/me, returning cached session");
    }

    return this.getCurrentUser();
  },

  /**
   * Real Backend Logout: POST /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      if (token) {
        await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Ignore network errors on logout
    }

    clearSession();
  },

  switchRole(role: UserRole): User {
    const current = getClientSession();
    if (current) return current;
    return this.getCurrentUser();
  },
};
