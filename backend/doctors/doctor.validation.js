/**
 * CareOps AI - Doctor Management Validation Layer
 * 
 * Enforces schema validation for doctor profile provisioning, availability updates,
 * patient assignments, and clinical note recording.
 */

const { USER_ROLES } = require("../config/roles");

const VALID_DOCTOR_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"];

/**
 * Validates payload for POST /api/v1/doctors
 * @param {object} payload 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateCreateDoctor(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Request body cannot be empty"] };
  }

  // 1. Linked User ID validation
  if (!payload.userId || typeof payload.userId !== "string" || !payload.userId.trim()) {
    errors.push("User ID (userId) is required to link an existing doctor user account");
  }

  // 2. Specialization validation
  if (!payload.specialization || typeof payload.specialization !== "string" || !payload.specialization.trim()) {
    errors.push("Doctor specialization is required");
  } else if (payload.specialization.trim().length < 2) {
    errors.push("Specialization must be at least 2 characters long");
  }

  // 3. Department validation
  if (!payload.department || typeof payload.department !== "string" || !payload.department.trim()) {
    errors.push("Department is required");
  } else if (payload.department.trim().length < 2) {
    errors.push("Department must be at least 2 characters long");
  }

  // 4. Experience validation (if provided)
  if (payload.experience !== undefined) {
    const exp = Number(payload.experience);
    if (isNaN(exp) || exp < 0) {
      errors.push("Experience must be a positive number of years");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates payload for PATCH /api/v1/doctors/:id
 * Enforces role-based field editability restrictions.
 * @param {object} payload 
 * @param {string} userRole 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateUpdateDoctor(payload, userRole) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
    return { isValid: false, errors: ["Update payload cannot be empty"] };
  }

  // Role editability restrictions for Doctor role
  if (userRole === USER_ROLES.DOCTOR) {
    if (payload.department !== undefined) {
      errors.push("Doctors cannot modify their own department; contact hospital administration");
    }
    if (payload.status !== undefined) {
      errors.push("Doctors cannot modify their own active employment status; contact administration");
    }
    if (payload.userId !== undefined || payload.employeeId !== undefined) {
      errors.push("Internal IDs cannot be altered");
    }
  }

  // Status enum validation if provided
  if (payload.status !== undefined) {
    const statusUpper = payload.status.toString().toUpperCase().trim();
    if (!VALID_DOCTOR_STATUSES.includes(statusUpper)) {
      errors.push(`Invalid status. Allowed values: ${VALID_DOCTOR_STATUSES.join(", ")}`);
    }
  }

  // Experience validation
  if (payload.experience !== undefined) {
    const exp = Number(payload.experience);
    if (isNaN(exp) || exp < 0) {
      errors.push("Experience must be a positive number");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates payload for PATCH /api/v1/doctors/:id/availability
 * @param {object} payload 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateAvailabilityUpdate(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Availability payload cannot be empty"] };
  }

  if (!payload.availability || !Array.isArray(payload.availability)) {
    errors.push("Availability must be provided as an array of schedule slots or schedule objects");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates payload for PATCH /api/v1/doctors/:id/patients
 * @param {object} payload 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateAssignPatient(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Assignment payload cannot be empty"] };
  }

  if (!payload.patientId || typeof payload.patientId !== "string" || !payload.patientId.trim()) {
    errors.push("Patient ID (patientId) is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates payload for POST /api/v1/doctors/:id/notes
 * @param {object} payload 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateAddNote(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Clinical note payload cannot be empty"] };
  }

  if (!payload.patientId || typeof payload.patientId !== "string" || !payload.patientId.trim()) {
    errors.push("Patient ID (patientId) is required");
  }

  if (!payload.note || typeof payload.note !== "string" || !payload.note.trim()) {
    errors.push("Clinical note text is required");
  } else if (payload.note.trim().length < 2) {
    errors.push("Clinical note must be at least 2 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateAvailabilityUpdate,
  validateAssignPatient,
  validateAddNote,
  VALID_DOCTOR_STATUSES,
};
