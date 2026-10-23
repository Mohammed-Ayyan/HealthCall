/**
 * CareOps AI - User Management Validation Layer
 * 
 * Enforces business rules and data constraints for user creation,
 * updates, queries, and status transitions.
 */

const { USER_ROLES, normalizeRole, USER_STATUS, normalizeStatus } = require("../config/roles");

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates payload for creating a new user (POST /api/v1/users)
 * @param {object} data 
 * @returns {{ isValid: boolean, errors: string[], sanitized: object }}
 */
function validateCreateUser(data) {
  const errors = [];
  const sanitized = {};

  // 1. Name validation
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.push("Name is required and must be at least 2 characters long");
  } else {
    sanitized.name = data.name.trim();
  }

  // 2. Email validation
  if (!data.email || typeof data.email !== "string" || !EMAIL_REGEX.test(data.email.trim())) {
    errors.push("A valid email address is required");
  } else {
    sanitized.email = data.email.trim().toLowerCase();
  }

  // 3. Password validation
  if (!data.password || typeof data.password !== "string" || data.password.length < 6) {
    errors.push("Password is required and must be at least 6 characters long");
  } else {
    sanitized.password = data.password;
  }

  // 4. Role validation
  const canonicalRole = normalizeRole(data.role);
  if (!canonicalRole) {
    errors.push(`Role is invalid. Allowed roles: ${Object.values(USER_ROLES).join(", ")}`);
  } else {
    sanitized.role = canonicalRole;
  }

  // 5. Department validation: Required for staff, optional for patients
  const isStaffRole = canonicalRole && canonicalRole !== USER_ROLES.PATIENT;
  const deptInput = data.department ? data.department.trim() : "";

  if (isStaffRole && !deptInput) {
    errors.push(`Department is required for staff members with role '${canonicalRole}'`);
  } else {
    sanitized.department = deptInput;
  }

  // 6. Optional status validation
  if (data.status) {
    const canonicalStatus = normalizeStatus(data.status);
    if (!canonicalStatus) {
      errors.push(`Status is invalid. Allowed values: ${Object.values(USER_STATUS).join(", ")}`);
    } else {
      sanitized.status = canonicalStatus;
    }
  } else {
    sanitized.status = USER_STATUS.ACTIVE;
  }

  // 7. Optional fields
  sanitized.phone = data.phone ? data.phone.trim() : "";
  sanitized.avatar = data.avatar ? data.avatar.trim() : "";

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validates payload for updating an existing user (PATCH /api/v1/users/:id)
 * Editable fields: name, phone, department, role, avatar
 * Passwords are strictly disallowed through this API.
 * 
 * @param {object} data 
 * @returns {{ isValid: boolean, errors: string[], sanitized: object }}
 */
function validateUpdateUser(data) {
  const errors = [];
  const sanitized = {};

  // Reject any attempts to mutate password through general update
  if ("password" in data) {
    errors.push("Password cannot be updated through this endpoint");
  }

  // Name
  if ("name" in data) {
    if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    } else {
      sanitized.name = data.name.trim();
    }
  }

  // Role
  if ("role" in data) {
    const canonicalRole = normalizeRole(data.role);
    if (!canonicalRole) {
      errors.push(`Role is invalid. Allowed roles: ${Object.values(USER_ROLES).join(", ")}`);
    } else {
      sanitized.role = canonicalRole;
    }
  }

  // Department
  if ("department" in data) {
    sanitized.department = typeof data.department === "string" ? data.department.trim() : "";
  }

  // Phone
  if ("phone" in data) {
    sanitized.phone = typeof data.phone === "string" ? data.phone.trim() : "";
  }

  // Avatar
  if ("avatar" in data) {
    sanitized.avatar = typeof data.avatar === "string" ? data.avatar.trim() : "";
  }

  // Status (if updated via this endpoint)
  if ("status" in data) {
    const canonicalStatus = normalizeStatus(data.status);
    if (!canonicalStatus) {
      errors.push(`Status is invalid. Allowed values: ${Object.values(USER_STATUS).join(", ")}`);
    } else {
      sanitized.status = canonicalStatus;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validates status change payload (PATCH /api/v1/users/:id/status)
 * @param {object} data 
 * @returns {{ isValid: boolean, errors: string[], status: string }}
 */
function validateStatusUpdate(data) {
  const errors = [];
  if (!data || !data.status) {
    errors.push("Status is required");
    return { isValid: false, errors, status: null };
  }

  const canonicalStatus = normalizeStatus(data.status);
  if (!canonicalStatus) {
    errors.push(`Status must match allowed values: ${Object.values(USER_STATUS).join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    status: canonicalStatus,
  };
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateStatusUpdate,
};
