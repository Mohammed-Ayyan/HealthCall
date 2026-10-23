/**
 * CareOps AI - Insurance Service Layer
 * 
 * Implements business logic for insurance claim management,
 * policy verification, status adjudications, and role-based isolation.
 */

const InsuranceClaim = require("../models/InsuranceClaim");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { USER_ROLES } = require("../config/roles");
const {
  validateCreateClaim,
  validateUpdateClaimStatus,
  normalizeClaimStatus,
  normalizeClaimPriority,
} = require("./insurance.validation");

/**
 * Creates and persists a new insurance claim in MongoDB.
 */
async function createClaim({ payload, requester }) {
  // 1. Role permission guard: Patients cannot submit internal insurance carrier claims
  if (requester && requester.role === USER_ROLES.PATIENT) {
    const error = new Error("Patients do not have permission to submit internal insurance claims");
    error.statusCode = 403;
    throw error;
  }

  // 2. Validate input
  const validated = validateCreateClaim(payload);

  // 3. Verify Patient exists
  const patient = await Patient.findById(validated.patientId);
  if (!patient) {
    const error = new Error(`Patient with ID '${validated.patientId}' does not exist`);
    error.statusCode = 404;
    throw error;
  }

  // 4. Instantiate new claim
  const newClaim = new InsuranceClaim({
    patientId: validated.patientId,
    insuranceProvider: validated.insuranceProvider || patient.insuranceProvider || "BlueCross Premier PPO",
    policyNumber: validated.policyNumber,
    claimAmount: validated.claimAmount,
    claimReason: validated.claimReason,
    claimType: validated.claimType,
    priority: validated.priority,
    status: "SUBMITTED",
    submittedBy: requester ? requester.id : null,
    serviceDate: validated.serviceDate,
    dueDate: validated.dueDate,
    reviewNotes: validated.reviewNotes,
    aiMetadata: validated.aiMetadata,
  });

  await newClaim.save();

  // 5. Populate relational references
  await newClaim.populate([
    { path: "patientId", select: "name email phone mrn department insuranceProvider insuranceStatus" },
    { path: "submittedBy", select: "name email role department" },
    { path: "reviewedBy", select: "name email role department" },
  ]);

  return newClaim.toJSON();
}

/**
 * Lists insurance claims strictly scoped by user role.
 */
async function listClaims({ requester, filters = {} }) {
  const query = {};

  // 1. Role-based scoping
  if (requester.role === USER_ROLES.PATIENT) {
    // Find patient record linked to this patient user
    const patientProfile = await Patient.findOne({
      $or: [
        { userId: requester.id },
        { email: requester.email.toLowerCase() },
      ],
    });

    if (!patientProfile) {
      return [];
    }

    query.patientId = patientProfile._id;
  } else if (filters.patientId) {
    // Staff roles can filter by specific patientId
    query.patientId = filters.patientId;
  }

  // 2. Query filters
  if (filters.status) {
    const norm = normalizeClaimStatus(filters.status);
    if (norm) query.status = norm;
  }

  if (filters.priority) {
    const normPrio = normalizeClaimPriority(filters.priority);
    if (normPrio) query.priority = normPrio;
  }

  if (filters.insuranceProvider) {
    query.insuranceProvider = new RegExp(filters.insuranceProvider.trim(), "i");
  }

  const claims = await InsuranceClaim.find(query)
    .populate("patientId", "name email phone mrn department insuranceProvider insuranceStatus")
    .populate("submittedBy", "name email role department")
    .populate("reviewedBy", "name email role department")
    .sort({ createdAt: -1 });

  return claims.map((c) => c.toJSON());
}

/**
 * Retrieves a single insurance claim by ID ensuring caller has authorization.
 */
async function getClaimById({ id, requester }) {
  const claim = await InsuranceClaim.findById(id)
    .populate("patientId", "name email phone mrn department insuranceProvider insuranceStatus")
    .populate("submittedBy", "name email role department")
    .populate("reviewedBy", "name email role department");

  if (!claim) {
    const error = new Error(`Insurance claim with ID '${id}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Patient security guard: Patients can only inspect their own claims
  if (requester.role === USER_ROLES.PATIENT) {
    const patientProfile = await Patient.findOne({
      $or: [
        { userId: requester.id },
        { email: requester.email.toLowerCase() },
      ],
    });

    const isOwner =
      patientProfile &&
      claim.patientId &&
      claim.patientId._id.toString() === patientProfile._id.toString();

    if (!isOwner) {
      const error = new Error("You do not have permission to view this insurance claim");
      error.statusCode = 403;
      throw error;
    }
  }

  return claim.toJSON();
}

/**
 * Updates claim status along state machine (Admin & Insurance Employee only).
 */
async function updateClaimStatus({ id, payload, requester }) {
  // Only ADMIN and INSURANCE_EMPLOYEE can update claim adjudication status
  if (
    requester.role !== USER_ROLES.ADMIN &&
    requester.role !== USER_ROLES.INSURANCE_EMPLOYEE
  ) {
    const error = new Error(
      "Only Administrators and Insurance Specialists have permission to update claim status"
    );
    error.statusCode = 403;
    throw error;
  }

  const claim = await InsuranceClaim.findById(id);
  if (!claim) {
    const error = new Error(`Insurance claim with ID '${id}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Validate state transition
  const validated = validateUpdateClaimStatus(payload, claim.status);

  claim.status = validated.status;
  claim.reviewedBy = requester.id;

  if (validated.reviewNotes) {
    claim.reviewNotes = validated.reviewNotes;
  }
  if (validated.denialReason) {
    claim.denialReason = validated.denialReason;
  }

  await claim.save();

  // Sync patient insurance status if relevant
  if (claim.patientId) {
    if (validated.status === "APPROVED") {
      await Patient.findByIdAndUpdate(claim.patientId, {
        insuranceStatus: "Active & Verified",
      });
    } else if (validated.status === "REJECTED") {
      await Patient.findByIdAndUpdate(claim.patientId, {
        insuranceStatus: "Action Needed",
      });
    }
  }

  await claim.populate([
    { path: "patientId", select: "name email phone mrn department insuranceProvider insuranceStatus" },
    { path: "submittedBy", select: "name email role department" },
    { path: "reviewedBy", select: "name email role department" },
  ]);

  return claim.toJSON();
}

/**
 * Retrieves comprehensive insurance and eligibility profile for a patient.
 */
async function getPatientInsurance({ patientId, requester }) {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    const error = new Error(`Patient with ID '${patientId}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Security guard: If requester is a Patient, they must be this specific patient
  if (requester.role === USER_ROLES.PATIENT) {
    const isSelf =
      (patient.userId && patient.userId.toString() === requester.id) ||
      (patient.email && patient.email.toLowerCase() === requester.email.toLowerCase());

    if (!isSelf) {
      const error = new Error("You do not have permission to view other patients' insurance information");
      error.statusCode = 403;
      throw error;
    }
  }

  // Retrieve all historical claims for this patient
  const claims = await InsuranceClaim.find({ patientId: patient._id })
    .populate("submittedBy", "name email role department")
    .populate("reviewedBy", "name email role department")
    .sort({ createdAt: -1 });

  const totalClaims = claims.length;
  const pendingClaims = claims.filter(
    (c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW"
  ).length;
  const approvedClaims = claims.filter(
    (c) => c.status === "APPROVED" || c.status === "COMPLETED"
  ).length;
  const rejectedClaims = claims.filter((c) => c.status === "REJECTED").length;
  const totalClaimedAmount = claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);

  return {
    patient: {
      id: patient.id,
      name: patient.name,
      mrn: patient.mrn,
      email: patient.email,
      phone: patient.phone,
      insuranceProvider: patient.insuranceProvider || "BlueCross Premier PPO",
      insuranceStatus: patient.insuranceStatus || "Active & Verified",
      policyNumber: claims[0]?.policyNumber || `POL-${patient.mrn?.replace("MRN-", "") || "884920"}`,
    },
    summary: {
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      totalClaimedAmount,
    },
    claims: claims.map((c) => c.toJSON()),
  };
}

module.exports = {
  createClaim,
  listClaims,
  getClaimById,
  updateClaimStatus,
  getPatientInsurance,
};
