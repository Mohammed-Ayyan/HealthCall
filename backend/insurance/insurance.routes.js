/**
 * CareOps AI - Insurance Management Routes
 * 
 * Endpoints under /api/v1/insurance protected by authMiddleware and requireRole guards.
 */

const express = require("express");
const insuranceController = require("./insurance.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// Enforce authentication across all insurance endpoints
router.use(authMiddleware);

// API 1: CREATE CLAIM
// Hospital staff only (Patients are blocked)
router.post(
  ["/", "/claims"],
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER
  ),
  insuranceController.createClaim
);

// API 2: GET CLAIMS (Role-scoped)
router.get(
  ["/", "/claims"],
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.PATIENT
  ),
  insuranceController.getClaims
);

// API 3: GET SINGLE CLAIM
router.get(
  ["/:id", "/claims/:id"],
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.PATIENT
  ),
  insuranceController.getClaim
);

// API 4: UPDATE CLAIM STATUS
// Only ADMIN & INSURANCE_EMPLOYEE can modify adjudication status
router.patch(
  ["/:id/status", "/claims/:id/status"],
  requireRole(USER_ROLES.ADMIN, USER_ROLES.INSURANCE_EMPLOYEE),
  insuranceController.updateClaimStatus
);

// API 5: GET PATIENT INSURANCE & CLAIMS SUMMARY
router.get(
  "/patient/:id",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.PATIENT
  ),
  insuranceController.getPatientInsurance
);

module.exports = router;
