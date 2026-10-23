import { User } from "@/shared/types/user";
import { apiUserService } from "./users/apiUserService";

/**
 * Enterprise User Management Service
 * Bridges seamlessly between local fallback state and real backend APIs (/api/v1/users).
 * Provides drop-in compatibility for existing UI components.
 */
export const mockUserService = {
  async getUsers(filters?: { role?: string; department?: string; status?: string; search?: string }): Promise<User[]> {
    return apiUserService.getUsers(filters);
  },

  async getUserById(id: string): Promise<User | null> {
    return apiUserService.getUserById(id);
  },

  async createUser(newUser: any): Promise<User> {
    return apiUserService.createUser(newUser);
  },

  async addUser(newUser: any): Promise<User> {
    return apiUserService.addUser(newUser);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    return apiUserService.updateUser(id, updates);
  },

  async changeStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<User | null> {
    return apiUserService.changeStatus(id, status);
  },

  async deleteUser(id: string): Promise<boolean> {
    return apiUserService.deleteUser(id);
  },
};

export { apiUserService };
