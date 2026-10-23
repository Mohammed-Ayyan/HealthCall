/**
 * CareOps AI - Real Backend Insurance & Claims Management Client
 * 
 * Direct API client for Express / MongoDB backend (/api/v1/insurance).
 * Provides full CRUD and adjudication tracking for medical claims.
 */

import {
  InsuranceClaim,
  InsuranceOverviewData,
  ClaimTimelineStage,
} from "@/features/insurance/types";
import { getClientToken } from "../auth/sessionStore";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

export interface BackendInsuranceClaim {
  id: string;
  _id?: string;
  claimNumber: string;
  patientId: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    mrn?: string;
    department?: string;
    insuranceProvider?: string;
    insuranceStatus?: string;
  } | string;
  insuranceProvider: string;
  policyNumber: string;
  claimAmount: number;
  claimReason: string;
  claimType: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED";
  submittedBy?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | string;
  reviewedBy?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | string;
  reviewNotes?: string;
  denialReason?: string;
  serviceDate?: string;
  dueDate?: string;
  aiMetadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function mapBackendClaimToFrontend(c: BackendInsuranceClaim): InsuranceClaim {
  const patientObj = typeof c.patientId === "object" ? c.patientId : null;

  // Map claim type
  let claimType: InsuranceClaim["claimType"] = "Prior-Authorization";
  if (c.claimType === "POST_OP_COVERAGE") claimType = "Post-Op Surgical Coverage";
  else if (c.claimType === "MEDICATION_APPROVAL") claimType = "Medication Approval";
  else if (c.claimType === "DIAGNOSTIC_IMAGING") claimType = "Diagnostic Imaging";

  // Map status
  let status: InsuranceClaim["status"] = "Pending Review";
  if (c.status === "UNDER_REVIEW") status = "Under Carrier Audit";
  else if (c.status === "APPROVED" || c.status === "COMPLETED") status = "Approved";
  else if (c.status === "REJECTED") status = "Rejected";

  // Map priority
  let priority: InsuranceClaim["priority"] = "Medium";
  if (c.priority === "URGENT") priority = "Urgent";
  else if (c.priority === "HIGH") priority = "High";
  else if (c.priority === "LOW") priority = "Routine";

  // Map stage
  let currentStage: ClaimTimelineStage = "Submitted";
  if (c.status === "UNDER_REVIEW") currentStage = "Reviewed";
  else if (c.status === "APPROVED") currentStage = "Updated";
  else if (c.status === "COMPLETED") currentStage = "Completed";
  else if (c.status === "REJECTED") currentStage = "Reviewed";

  const isReviewed = ["Reviewed", "Updated", "Completed"].includes(currentStage);
  const isUpdated = ["Updated", "Completed"].includes(currentStage);
  const isCompleted = currentStage === "Completed";

  const timelineHistory = [
    {
      stage: "Submitted" as ClaimTimelineStage,
      timestamp: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Initial Intake",
      details: `Claim ${c.claimNumber} generated with clinical code: ${c.claimReason}`,
      completed: true,
    },
    {
      stage: "Reviewed" as ClaimTimelineStage,
      timestamp: isReviewed ? "Adjudicated" : "Pending Carrier",
      details: c.reviewNotes || "Carrier eligibility verification & benefit schedule validation",
      completed: isReviewed,
    },
    {
      stage: "Updated" as ClaimTimelineStage,
      timestamp: isUpdated ? "Pre-Auth Granted" : "Pending Payer",
      details: c.status === "REJECTED" ? `Denial recorded: ${c.denialReason || "Documentation deficit"}` : "Electronic pre-auth token issued with clinical audit trail",
      completed: isUpdated,
    },
    {
      stage: "Completed" as ClaimTimelineStage,
      timestamp: isCompleted ? "Payout Dispatched" : "Pending Final Settlement",
      details: "Remittance advice matched and hospital ledger credited",
      completed: isCompleted,
    },
  ];

  return {
    id: c.id || c._id || `clm-${Date.now()}`,
    claimId: c.claimNumber || (c.id ? `CLM-${c.id.slice(-6).toUpperCase()}` : "CLM-PENDING"),
    patientName: patientObj?.name || "Patient Record",
    mrn: patientObj?.mrn || "MRN-884920",
    payerName: c.insuranceProvider || patientObj?.insuranceProvider || "BlueCross BlueShield",
    claimType,
    status,
    priority,
    deadline: c.dueDate ? new Date(c.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today 4:00 PM",
    amount: `$${Number(c.claimAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    aiConversationSummary:
      c.aiMetadata?.transcriptSnippet ||
      c.claimReason ||
      "Patient called regarding insurance coverage verification for scheduled procedure.",
    requiredAction:
      c.status === "SUBMITTED"
        ? "Review clinical documentation and dispatch prior-auth"
        : c.status === "UNDER_REVIEW"
        ? "Carrier audit in progress; await electronic adjudication"
        : c.status === "APPROVED"
        ? "Authorization confirmed; notify clinician and patient"
        : "Evaluate denial codes and file expedited appeal",
    currentStage,
    timelineHistory,
  };
}

export const apiInsuranceService = {
  /**
   * GET /api/v1/insurance/claims
   * Retrieve list of claims from MongoDB
   */
  async getClaims(filters?: {
    status?: string;
    priority?: string;
    insuranceProvider?: string;
    patientId?: string;
  }): Promise<InsuranceClaim[]> {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const q = new URLSearchParams();
      if (filters?.status) q.append("status", filters.status);
      if (filters?.priority) q.append("priority", filters.priority);
      if (filters?.insuranceProvider) q.append("insuranceProvider", filters.insuranceProvider);
      if (filters?.patientId) q.append("patientId", filters.patientId);

      const res = await fetch(`${BACKEND_BASE_URL}/insurance/claims?${q.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch claims: ${res.status}`);
      }

      const data = await res.json();
      const rawClaims: BackendInsuranceClaim[] = data.claims || [];
      return rawClaims.map(mapBackendClaimToFrontend);
    } catch (err: any) {
      console.warn("[apiInsuranceService] Error fetching claims:", err.message);
      return [];
    }
  },

  /**
   * GET /api/v1/insurance/claims/:id
   */
  async getClaimById(id: string): Promise<InsuranceClaim | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/insurance/claims/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      return mapBackendClaimToFrontend(data.claim);
    } catch (err: any) {
      console.warn("[apiInsuranceService] Error fetching claim by ID:", err.message);
      return null;
    }
  },

  /**
   * POST /api/v1/insurance/claims
   */
  async createClaim(payload: {
    patientId: string;
    insuranceProvider: string;
    policyNumber: string;
    claimAmount: number;
    claimReason: string;
    claimType?: string;
    priority?: string;
    dueDate?: string;
  }): Promise<InsuranceClaim | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const res = await fetch(`${BACKEND_BASE_URL}/insurance/claims`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create claim: ${res.status}`);
    }

    const data = await res.json();
    return mapBackendClaimToFrontend(data.claim);
  },

  /**
   * PATCH /api/v1/insurance/claims/:id/status
   */
  async updateClaimStatus(
    claimId: string,
    status: string,
    reviewNotes?: string,
    denialReason?: string
  ): Promise<InsuranceClaim | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    // Map frontend status string to backend enum
    let backendStatus = "SUBMITTED";
    const s = status.toLowerCase();
    if (s.includes("audit") || s.includes("review")) backendStatus = "UNDER_REVIEW";
    else if (s.includes("approv") || s.includes("confirm")) backendStatus = "APPROVED";
    else if (s.includes("reject") || s.includes("deni")) backendStatus = "REJECTED";
    else if (s.includes("complete")) backendStatus = "COMPLETED";

    const res = await fetch(`${BACKEND_BASE_URL}/insurance/claims/${claimId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: backendStatus,
        reviewNotes,
        denialReason,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update status: ${res.status}`);
    }

    const data = await res.json();
    return mapBackendClaimToFrontend(data.claim);
  },

  /**
   * GET /api/v1/insurance/patient/:id
   */
  async getPatientInsurance(patientId: string): Promise<any | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/insurance/patient/${patientId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (err: any) {
      console.warn("[apiInsuranceService] Error fetching patient insurance:", err.message);
      return null;
    }
  },
};
