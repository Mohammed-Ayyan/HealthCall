import { InsuranceOverviewData, InsuranceClaim, ClaimTimelineStage } from "../types";
import { apiInsuranceService } from "@/features/platform/insurance/apiInsuranceService";
import { authService } from "@/features/platform/auth/authService";

export const mockInsuranceClaims: InsuranceClaim[] = [];

/**
 * Insurance Service (Connected to live MongoDB backend / zero fake data)
 */
export const insuranceService = {
  async getOverview(): Promise<InsuranceOverviewData> {
    try {
      const claims = await apiInsuranceService.getClaims();
      const currentUser = authService.getCurrentUser();

      const pending = claims.filter(
        (c) => c.status === "Pending Review" || c.status === "Under Carrier Audit"
      ).length;
      const approved = claims.filter((c) => c.status === "Approved").length;
      const rejected = claims.filter((c) => c.status === "Rejected").length;
      const urgent = claims.filter(
        (c) => c.priority === "Urgent" || c.priority === "High"
      ).length;

      return {
        employeeName: currentUser?.name || "Insurance Operations Lead",
        department: currentUser?.department || "RCM & Prior-Authorization Division",
        pendingClaimsCount: pending,
        approvedClaimsCount: approved,
        rejectedClaimsCount: rejected,
        urgentCasesCount: urgent,
      };
    } catch (e: any) {
      console.warn("[insuranceService] Error calculating overview:", e.message);
      return {
        employeeName: "Insurance Operations Lead",
        department: "RCM & Prior-Authorization Division",
        pendingClaimsCount: 0,
        approvedClaimsCount: 0,
        rejectedClaimsCount: 0,
        urgentCasesCount: 0,
      };
    }
  },

  async getClaims(): Promise<InsuranceClaim[]> {
    try {
      const claims = await apiInsuranceService.getClaims();
      return claims;
    } catch (e: any) {
      console.warn("[insuranceService] Error retrieving claims:", e.message);
      return [];
    }
  },

  async updateClaimStage(claimId: string, nextStage: ClaimTimelineStage): Promise<boolean> {
    try {
      let targetStatus = "UNDER_REVIEW";
      if (nextStage === "Submitted") targetStatus = "SUBMITTED";
      else if (nextStage === "Reviewed") targetStatus = "UNDER_REVIEW";
      else if (nextStage === "Updated") targetStatus = "APPROVED";
      else if (nextStage === "Completed") targetStatus = "COMPLETED";

      const updated = await apiInsuranceService.updateClaimStatus(
        claimId,
        targetStatus,
        `Advanced to timeline stage: ${nextStage}`
      );
      return !!updated;
    } catch (e: any) {
      console.warn("[insuranceService] Failed to advance claim stage:", e.message);
      return false;
    }
  },

  async updateClaimStatus(claimId: string, status: InsuranceClaim["status"]): Promise<boolean> {
    try {
      const updated = await apiInsuranceService.updateClaimStatus(
        claimId,
        status,
        `Status set to ${status} by insurance operator`
      );
      return !!updated;
    } catch (e: any) {
      console.warn("[insuranceService] Failed to update claim status:", e.message);
      return false;
    }
  },
};
