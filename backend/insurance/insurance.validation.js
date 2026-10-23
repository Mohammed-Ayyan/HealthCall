/**
 * CareOps AI - Insurance Validation Layer
 * 
 * Validates claim creation, adjudication status transitions,
 * policy formatting, and financial numerical constraints.
 */

const mongoose = require("mongoose");

const VALID_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
];

const VALID_TYPES = [
  "PRIOR_AUTHORIZATION",
  "POST_OP_COVERAGE",
  "MEDICATION_APPROVAL",
  "DIAGNOSTIC_IMAGING",
  "GENERAL_CONSULTATION",
];

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// Strict lifecycle transitions for insurance claims
const ALLOWED_STATUS_TRANSITIONS = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"], // Re-opened upon appeal submission
  COMPLETED: [], // Terminal finalized payout stage
};

function normalizeClaimStatus(status) {
  if (!status || typeof status !== "string") return null;
  const s = status.trim().toUpperCase().replace(/\s+/g, "_");
  if (VALID_STATUSES.includes(s)) return s;
  if (s === "PENDING" || s === "PENDING_REVIEW") return "SUBMITTED";
  if (s === "AUDIT" || s === "UNDER_CARRIER_AUDIT") return "UNDER_REVIEW";
  return null;
}

function normalizeClaimType(type) {
  if (!type || typeof type !== "string") return "PRIOR_AUTHORIZATION";
  const t = type.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (VALID_TYPES.includes(t)) return t;
  if (t.includes("PRIOR") || t.includes("AUTH")) return "PRIOR_AUTHORIZATION";
  if (t.includes("SURG") || t.includes("POST_OP")) return "POST_OP_COVERAGE";
  if (t.includes("MED") || t.includes("DRUG")) return "MEDICATION_APPROVAL";
  if (t.includes("IMAGE") || t.includes("SCAN") || t.includes("XRAY")) return "DIAGNOSTIC_IMAGING";
  return "GENERAL_CONSULTATION";
}

function normalizeClaimPriority(prio) {
  if (!prio || typeof prio !== "string") return "MEDIUM";
  const p = prio.trim().toUpperCase();
  if (VALID_PRIORITIES.includes(p)) return p;
  if (p === "CRITICAL") return "URGENT";
  if (p === "ROUTINE") return "LOW";
  return "MEDIUM";
}

function validateCreateClaim(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    const error = new Error("Request body must be a valid JSON object");
    error.statusCode = 400;
    throw error;
  }

  // 1. patientId
  if (!payload.patientId) {
    errors.push("patientId is required");
  } else if (!mongoose.Types.ObjectId.isValid(payload.patientId)) {
    errors.push(`Invalid patientId format: '${payload.patientId}'`);
  }

  // 2. insuranceProvider
  if (!payload.insuranceProvider || typeof payload.insuranceProvider !== "string") {
    errors.push("insuranceProvider is required");
  } else if (payload.insuranceProvider.trim().length < 2) {
    errors.push("insuranceProvider must be at least 2 characters");
  }

  // 3. policyNumber
  if (!payload.policyNumber || typeof payload.policyNumber !== "string") {
    errors.push("policyNumber is required");
  } else if (payload.policyNumber.trim().length < 2) {
    errors.push("policyNumber must be at least 2 characters");
  }

  // 4. claimAmount
  const amount = Number(payload.claimAmount);
  if (payload.claimAmount === undefined || payload.claimAmount === null || isNaN(amount)) {
    errors.push("claimAmount is required and must be a number");
  } else if (amount < 0) {
    errors.push("claimAmount cannot be negative");
  }

  // 5. claimReason
  if (!payload.claimReason || typeof payload.claimReason !== "string") {
    errors.push("claimReason is required");
  } else if (payload.claimReason.trim().length < 3) {
    errors.push("claimReason must be at least 3 characters long");
  }

  if (errors.length > 0) {
    const error = new Error(`Validation failed: ${errors.join("; ")}`);
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }

  return {
    patientId: payload.patientId,
    insuranceProvider: payload.insuranceProvider.trim(),
    policyNumber: payload.policyNumber.trim().toUpperCase(),
    claimAmount: amount,
    claimReason: payload.claimReason.trim(),
    claimType: normalizeClaimType(payload.claimType),
    priority: normalizeClaimPriority(payload.priority),
    serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : new Date(),
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    reviewNotes: payload.reviewNotes ? payload.reviewNotes.trim() : "",
    aiMetadata: payload.aiMetadata && typeof payload.aiMetadata === "object" ? payload.aiMetadata : {},
  };
}

function validateUpdateClaimStatus(payload, currentStatus) {
  if (!payload || !payload.status) {
    const error = new Error("Target status is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedTarget = normalizeClaimStatus(payload.status);
  if (!normalizedTarget) {
    const error = new Error(
      `Invalid claim status '${payload.status}'. Allowed: ${VALID_STATUSES.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  if (currentStatus) {
    const normCurrent = currentStatus.toUpperCase();
    if (normCurrent === normalizedTarget) {
      // Idempotent no-op allowed
      return {
        status: normalizedTarget,
        reviewNotes: payload.reviewNotes || "",
        denialReason: payload.denialReason || "",
      };
    }

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[normCurrent] || [];
    if (!allowedNext.includes(normalizedTarget)) {
      const error = new Error(
        `Invalid status transition from '${normCurrent}' to '${normalizedTarget}'. Allowed: [${allowedNext.join(", ")}]`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // If rejected, ensure denialReason or reviewNotes is recorded if provided
  return {
    status: normalizedTarget,
    reviewNotes: payload.reviewNotes ? payload.reviewNotes.trim() : "",
    denialReason: payload.denialReason ? payload.denialReason.trim() : "",
  };
}

module.exports = {
  VALID_STATUSES,
  VALID_TYPES,
  VALID_PRIORITIES,
  ALLOWED_STATUS_TRANSITIONS,
  normalizeClaimStatus,
  normalizeClaimType,
  normalizeClaimPriority,
  validateCreateClaim,
  validateUpdateClaimStatus,
};
