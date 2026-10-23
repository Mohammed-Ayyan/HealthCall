import { User, UserRole } from "@/shared/types/user";
import { getRoleDashboard } from "./rolePermissions";
import {
  saveSession,
  clearSession,
  getClientSession,
  getClientToken,
} from "./sessionStore";

export interface LoginCredentials {
  email: string;
  password?: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  role: UserRole;
  user: User;
  token: string;
  redirectTo: string;
  error?: string;
}



export const ANONYMOUS_USER: User = {
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

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

/**
 * Enterprise Authentication Service
 * Seamlessly integrates live API endpoints with cookie & localStorage persistence
 */
export const authService = {
  getStoredUser(): User | null {
    return getClientSession();
  },

  getCurrentUser(): User {
    const stored = getClientSession();
    if (stored) return stored;
    return ANONYMOUS_USER;
  },

  getCurrentRole(): UserRole {
    return this.getCurrentUser().role;
  },

  getToken(): string | null {
    return getClientToken();
  },

  setSession(user: User, token?: string): void {
    saveSession(user, token);
  },

  clearSession(): void {
    clearSession();
  },

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

    const { mapBackendRoleToFrontend } = await import("./apiAuthService");
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

  async register(params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const { apiAuthService } = await import("./apiAuthService");
    return apiAuthService.register(params);
  },

  async fetchCurrentUser(): Promise<User | null> {
    const token = getClientToken();
    if (!token) return getClientSession();

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && (data.id || data._id)) {
        const { mapBackendRoleToFrontend } = await import("./apiAuthService");
        const feRole = mapBackendRoleToFrontend(data.role);
        const user: User = {
          id: data.id || data._id,
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
      // Ignore network errors
    }

    return getClientSession();
  },

  async logout(): Promise<void> {
    try {
      const token = getClientToken();
      if (token) {
        await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // ignore network errors
    }
    clearSession();
  },

  switchRole(role: UserRole): User {
    const current = getClientSession();
    if (current) return current;
    return ANONYMOUS_USER;
  },
};
