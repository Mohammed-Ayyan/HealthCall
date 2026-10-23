export interface InsuranceOverviewData {
  employeeName: string;
  department: string;
  pendingClaimsCount: number;
  approvedClaimsCount: number;
  rejectedClaimsCount: number;
  urgentCasesCount: number;
}
 
export type ClaimTimelineStage = "Submitted" | "Reviewed" | "Updated" | "Completed";

export interface InsuranceClaim {
  id: string;
  claimId: string;
  patientName: string;
  mrn: string;
  payerName: string; // e.g. "BlueCross BlueShield", "Aetna", "UnitedHealthcare"
  claimType: "Prior-Authorization" | "Post-Op Surgical Coverage" | "Medication Approval" | "Diagnostic Imaging";
  status: "Pending Review" | "Under Carrier Audit" | "Approved" | "Rejected";
  priority: "Urgent" | "High" | "Medium" | "Routine";
  deadline: string; // e.g. "Today 4:00 PM"
  amount: string;
  aiConversationSummary: string;
  requiredAction: string;
  currentStage: ClaimTimelineStage;
  timelineHistory: {
    stage: ClaimTimelineStage;
    timestamp: string;
    details: string;
    completed: boolean;
  }[];
}
