import { DepartmentName } from "./action";

export type UserRole =
  | "Patient"
  | "Doctor"
  | "Receptionist"
  | "Insurance Employee"
  | "Manager"
  | "Admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: "active" | "offline" | "on-call";
  avatar: string;
  assignedTasksCount?: number;
  completedTasksCount?: number;
  avgResolutionMinutes?: number;
  phone?: string;
  lastActive: string;
}
