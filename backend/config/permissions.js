/**
 * CareOps AI - Role-Based Access Control (RBAC) Permissions Matrix
 * 
 * Defines granular operational permissions mapped to each canonical role.
 * Designed to be modular, extendable, and easily inspectable by security middleware.
 */

const { USER_ROLES } = require("./roles");

const PERMISSIONS = Object.freeze({
  // Patient domain
  VIEW_OWN_PROFILE: "view_own_profile",
  REQUEST_APPOINTMENT: "request_appointment",
  VIEW_OWN_RECORDS: "view_own_records",

  // Clinical domain
  VIEW_ASSIGNED_PATIENTS: "view_assigned_patients",
  MANAGE_FOLLOWUPS: "manage_followups",
  CREATE_CARE_BRIEFS: "create_care_briefs",

  // Front-Desk domain
  MANAGE_APPOINTMENTS: "manage_appointments",
  EXECUTE_CALL_ACTIONS: "execute_call_actions",
  VIEW_PATIENT_DIRECTORY: "view_patient_directory",

  // Insurance / RCM domain
  MANAGE_INSURANCE_REQUESTS: "manage_insurance_requests",
  VERIFY_CLAIMS: "verify_claims",
  REVIEW_PRIOR_AUTH: "review_prior_auth",

  // Operations / Manager domain
  VIEW_DEPARTMENT_OPERATIONS: "view_department_operations",
  VIEW_DEPARTMENT_USERS: "view_department_users",
  MANAGE_WORKLOADS: "manage_workloads",
  RESOLVE_ESCALATIONS: "resolve_escalations",

  // Administrator domain
  MANAGE_USERS: "manage_users",
  FULL_ACCESS: "*",
});

const ROLE_PERMISSIONS = Object.freeze({
  [USER_ROLES.PATIENT]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.REQUEST_APPOINTMENT,
    PERMISSIONS.VIEW_OWN_RECORDS,
  ],

  [USER_ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.VIEW_ASSIGNED_PATIENTS,
    PERMISSIONS.MANAGE_FOLLOWUPS,
    PERMISSIONS.CREATE_CARE_BRIEFS,
  ],

  [USER_ROLES.RECEPTIONIST]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.EXECUTE_CALL_ACTIONS,
    PERMISSIONS.VIEW_PATIENT_DIRECTORY,
  ],

  [USER_ROLES.INSURANCE_EMPLOYEE]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.MANAGE_INSURANCE_REQUESTS,
    PERMISSIONS.VERIFY_CLAIMS,
    PERMISSIONS.REVIEW_PRIOR_AUTH,
  ],

  [USER_ROLES.DEPARTMENT_MANAGER]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.VIEW_DEPARTMENT_OPERATIONS,
    PERMISSIONS.VIEW_DEPARTMENT_USERS,
    PERMISSIONS.MANAGE_WORKLOADS,
    PERMISSIONS.RESOLVE_ESCALATIONS,
  ],

  [USER_ROLES.ADMIN]: [
    PERMISSIONS.FULL_ACCESS,
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.VIEW_ASSIGNED_PATIENTS,
    PERMISSIONS.MANAGE_FOLLOWUPS,
    PERMISSIONS.CREATE_CARE_BRIEFS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.EXECUTE_CALL_ACTIONS,
    PERMISSIONS.VIEW_PATIENT_DIRECTORY,
    PERMISSIONS.MANAGE_INSURANCE_REQUESTS,
    PERMISSIONS.VERIFY_CLAIMS,
    PERMISSIONS.REVIEW_PRIOR_AUTH,
    PERMISSIONS.VIEW_DEPARTMENT_OPERATIONS,
    PERMISSIONS.MANAGE_WORKLOADS,
    PERMISSIONS.RESOLVE_ESCALATIONS,
  ],
});

/**
 * Checks whether a role possesses a specific permission
 * @param {string} role 
 * @param {string} permission 
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(PERMISSIONS.FULL_ACCESS) || permissions.includes(permission);
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
};
