/**
 * CareOps AI - Patient Management Routes
 * 
 * Defines endpoints under /api/v1/patients with role-based access control.
 * Protected by authMiddleware and requireRole.
 */

const express = require("express");
const patientController = require("./patient.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// Enforce authentication across all patient management routes
router.use(authMiddleware);

// API 1: CREATE PATIENT (ADMIN, RECEPTIONIST)
router.post(
  "/",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST),
  patientController.createPatient
);

// API 2: GET ALL PATIENTS (ADMIN, DOCTOR, RECEPTIONIST, DEPARTMENT_MANAGER, INSURANCE_EMPLOYEE)
router.get(
  "/",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.INSURANCE_EMPLOYEE
  ),
  patientController.getPatients
);

// API 4: GET MY PROFILE (PATIENT, ADMIN)
// Mounted BEFORE /:id to prevent Express from treating "me" as an :id parameter
router.get(
  ["/me", "/profile/me"],
  requireRole(USER_ROLES.PATIENT, USER_ROLES.ADMIN),
  patientController.getMyProfile
);

// API 3: GET SINGLE PATIENT (Role-scoped inside controller/service)
router.get(
  "/:id",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.PATIENT
  ),
  patientController.getPatient
);

// API 5: UPDATE PATIENT (ADMIN, RECEPTIONIST, DOCTOR, PATIENT)
router.patch(
  "/:id",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DOCTOR,
    USER_ROLES.PATIENT
  ),
  patientController.updatePatient
);

// API 6: DELETE / SOFT-DEACTIVATE PATIENT (ADMIN ONLY)
router.delete(
  "/:id",
  requireRole(USER_ROLES.ADMIN),
  patientController.deletePatient
);

module.exports = router;
