/**
 * CareOps AI - Patient Management Input Validation
 * 
 * Validates request payloads for patient registration, updates, and searches.
 * Enforces role-based field editability restrictions (e.g., medical summary protection).
 */

const { USER_ROLES } = require("../config/roles");

const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_GENDERS = ["Male", "Female", "Other", "Non-Binary", "Prefer not to say"];
const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

/**
 * Validates payload for POST /api/v1/patients
 * @param {object} payload 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateCreatePatient(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Request body cannot be empty"] };
  }

  // 1. Name validation
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    errors.push("Patient name is required");
  } else if (payload.name.trim().length < 2) {
    errors.push("Patient name must be at least 2 characters long");
  }

  // 2. Email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!payload.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("Patient email is required");
  } else if (!emailRegex.test(payload.email.trim())) {
    errors.push("Please provide a valid email address");
  }

  // 3. Phone validation
  if (!payload.phone || typeof payload.phone !== "string" || !payload.phone.trim()) {
    errors.push("Phone number is required");
  } else if (payload.phone.trim().replace(/\D/g, "").length < 7) {
    errors.push("Phone number must contain at least 7 digits");
  }

  // 4. Blood Group validation (if provided)
  if (payload.bloodGroup && payload.bloodGroup.trim()) {
    const bgUpper = payload.bloodGroup.trim().toUpperCase();
    if (!VALID_BLOOD_GROUPS.includes(bgUpper)) {
      errors.push(`Invalid blood group. Allowed: ${VALID_BLOOD_GROUPS.join(", ")}`);
    }
  }

  // 5. Gender validation (if provided)
  if (payload.gender && payload.gender.trim()) {
    const matchedGender = VALID_GENDERS.find(
      (g) => g.toLowerCase() === payload.gender.trim().toLowerCase()
    );
    if (!matchedGender) {
      errors.push(`Invalid gender. Allowed: ${VALID_GENDERS.join(", ")}`);
    }
  }

  // 6. Date of birth validation (if provided)
  if (payload.dateOfBirth && typeof payload.dateOfBirth === "string") {
    const dob = new Date(payload.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push("Invalid date of birth format");
    } else if (dob > new Date()) {
      errors.push("Date of birth cannot be in the future");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates payload for PATCH /api/v1/patients/:id
 * Enforces role-based editing restrictions.
 * @param {object} payload 
 * @param {string} userRole 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateUpdatePatient(payload, userRole) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
    return { isValid: false, errors: ["Update payload cannot be empty"] };
  }

  // 1. Medical summary update permissions
  if (payload.medicalSummary !== undefined) {
    // Only Doctor and Admin can update medical summary
    if (userRole !== USER_ROLES.DOCTOR && userRole !== USER_ROLES.ADMIN) {
      errors.push("Only doctors and administrators can modify medical summaries");
    }
  }

  // 2. Status update permissions
  if (payload.status !== undefined) {
    if (userRole !== USER_ROLES.ADMIN) {
      errors.push("Only administrators can modify patient active status");
    } else {
      const statusUpper = payload.status.toString().toUpperCase().trim();
      if (!VALID_STATUSES.includes(statusUpper)) {
        errors.push(`Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`);
      }
    }
  }

  // 3. Blood group validation
  if (payload.bloodGroup !== undefined && payload.bloodGroup !== "") {
    const bgUpper = payload.bloodGroup.toString().toUpperCase().trim();
    if (!VALID_BLOOD_GROUPS.includes(bgUpper)) {
      errors.push(`Invalid blood group. Allowed: ${VALID_BLOOD_GROUPS.join(", ")}`);
    }
  }

  // 4. Phone validation
  if (payload.phone !== undefined) {
    if (typeof payload.phone !== "string" || payload.phone.trim().replace(/\D/g, "").length < 7) {
      errors.push("Phone number must contain at least 7 digits");
    }
  }

  // 5. Email validation
  if (payload.email !== undefined) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(payload.email.trim())) {
      errors.push("Please provide a valid email address");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateCreatePatient,
  validateUpdatePatient,
  VALID_BLOOD_GROUPS,
  VALID_GENDERS,
  VALID_STATUSES,
};
