export interface AdminOverviewData {
  administratorName: string;
  facilityName: string;
  totalCalls: number;
  patientsHandled: number;
  overallDepartmentEfficiency: number; // e.g. 96.4%
  aiAccuracyMetric: number; // e.g. 99.1%
  activeStaffCount: number;
  ecosystemStability: "Optimal" | "Degraded" | "Elevated Load";
  totalUsers?: number;
  totalPatients?: number;
  activeDoctors?: number;
  pendingTasks?: number;
  insuranceClaims?: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  activeDepartments?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Doctor" | "Receptionist" | "Insurance Employee" | "Department Manager" | "Hospital Administrator" | "Patient" | "Manager" | "Admin";
  department: string;
  status: "Active" | "Deactivated" | "Pending Verification";
  lastLogin: string;
  permissionsCount: number;
}

export interface HospitalDepartment {
  id: string;
  name: string;
  leadName: string;
  staffCount: number;
  currentWorkloadScore: number; // 0-100%
  status: "Fully Staffed" | "High Demand" | "Surge Mode";
  openCommitmentsCount: number;
}

export interface SystemRuleConfig {
  id: string;
  category: "Notification Rules" | "AI Settings" | "Routing Rules";
  title: string;
  description: string;
  enabled: boolean;
  value: string;
}
