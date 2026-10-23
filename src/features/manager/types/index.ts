export interface ManagerOverviewData {
  managerName: string;
  departmentName: string;
  totalEmployeesCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  avgResolutionHours: number;
  departmentVitalityScore: number; // e.g. 96%
}

export interface EmployeeWorkload {
  id: string;
  name: string;
  role: string;
  activeTasks: number;
  completedToday: number;
  overdueTasks: number;
  workloadStatus: "Optimal" | "Balanced" | "Near Capacity" | "Overloaded";
  efficiencyRating: number; // e.g. 94%
}

export interface EscalationCase {
  id: string;
  patientName: string;
  callId: string;
  issue: string;
  type: "Overdue Commitment" | "High Priority Case" | "Pending Clinical Approval";
  priority: "Urgent" | "High" | "Medium";
  assignedTo: string;
  overdueBy: string; // e.g. "+35 mins", "+2.5 hrs"
  status: "Escalated" | "Under Review" | "Reassigned" | "Resolved";
}
