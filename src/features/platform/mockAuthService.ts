import { User, UserRole } from "@/shared/types/user";
import { authService } from "./auth/authService";
import { apiAuthService } from "./auth/apiAuthService";

export const mockUsersList: User[] = [];

/**
 * Enterprise Authentication Service
 * Seamlessly transitions between mock testing and real backend API:
 * - Use `apiAuthService` for real HTTP endpoints (/api/v1/auth)
 * - Use `mockAuthService` for offline mock testing
 */
export const mockAuthService = {
  getCurrentUser(): User {
    return apiAuthService.getCurrentUser();
  },

  getCurrentRole(): UserRole {
    return apiAuthService.getCurrentRole();
  },

  async login(email: string, role: UserRole): Promise<User> {
    const res = await apiAuthService.login({ email, role });
    return res.user;
  },

  async logout(): Promise<void> {
    await apiAuthService.logout();
  },

  switchRole(role: UserRole): User {
    return apiAuthService.switchRole(role);
  },
};

export { apiAuthService };

