/**
 * CareOps AI - Role Constants & Enumerations
 * 
 * Strict role constants used across authentication, database modeling,
 * and RBAC middleware. Raw strings must not be used in business logic.
 */

const USER_ROLES = Object.freeze({
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  RECEPTIONIST: "RECEPTIONIST",
  INSURANCE_EMPLOYEE: "INSURANCE_EMPLOYEE",
  DEPARTMENT_MANAGER: "DEPARTMENT_MANAGER",
  ADMIN: "ADMIN",
});

const VALID_ROLES = Object.freeze(Object.values(USER_ROLES));

/**
 * Normalizes input role strings from frontend or API payloads
 * to the canonical USER_ROLES enum value.
 * Supports:
 * - Exact enum: "DOCTOR" -> "DOCTOR"
 * - TitleCase: "Doctor" -> "DOCTOR"
 * - Multi-word: "Insurance Employee" -> "INSURANCE_EMPLOYEE"
 * - Manager alias: "Manager" -> "DEPARTMENT_MANAGER"
 * 
 * @param {string} roleInput 
 * @returns {string|null} Canonical USER_ROLES value or null if invalid
 */
function normalizeRole(roleInput) {
  if (!roleInput || typeof roleInput !== "string") return null;

  const trimmed = roleInput.trim();
  const upper = trimmed.toUpperCase().replace(/\s+/g, "_");

  if (VALID_ROLES.includes(upper)) {
    return upper;
  }

  // Handle common frontend mappings
  if (upper === "MANAGER") return USER_ROLES.DEPARTMENT_MANAGER;
  if (upper === "INSURANCE") return USER_ROLES.INSURANCE_EMPLOYEE;
  if (upper === "RECEPTION") return USER_ROLES.RECEPTIONIST;

  return null;
}

const USER_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
});

const VALID_STATUSES = Object.freeze(Object.values(USER_STATUS));

/**
 * Normalizes input status strings from frontend or API payloads
 * to the canonical USER_STATUS enum value.
 * Supports: "active" -> "ACTIVE", "inactive" -> "INACTIVE", "suspended" -> "SUSPENDED"
 * 
 * @param {string} statusInput 
 * @returns {string|null} Canonical USER_STATUS value or null if invalid
 */
function normalizeStatus(statusInput) {
  if (!statusInput || typeof statusInput !== "string") return null;

  const upper = statusInput.trim().toUpperCase();
  if (VALID_STATUSES.includes(upper)) {
    return upper;
  }

  return null;
}

module.exports = {
  USER_ROLES,
  VALID_ROLES,
  normalizeRole,
  USER_STATUS,
  VALID_STATUSES,
  normalizeStatus,
};
