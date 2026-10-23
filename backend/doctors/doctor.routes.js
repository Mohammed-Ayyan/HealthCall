/**
 * CareOps AI - Doctor Management Routes
 * 
 * Defines endpoints under /api/v1/doctors with role-based access control.
 * Protected by authMiddleware and requireRole.
 */

const express = require("express");
const doctorController = require("./doctor.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// Apply authentication middleware across all doctor management routes
router.use(authMiddleware);

// API 1: CREATE DOCTOR PROFILE (ADMIN ONLY)
router.post(
  "/",
  requireRole(USER_ROLES.ADMIN),
  doctorController.createDoctor
);

// API 2: GET ALL DOCTORS (ADMIN, RECEPTIONIST, DEPARTMENT_MANAGER, PATIENT, DOCTOR)
router.get(
  "/",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.PATIENT,
    USER_ROLES.DOCTOR
  ),
  doctorController.getDoctors
);

// API 4: GET MY DOCTOR PROFILE (DOCTOR, ADMIN)
// Mounted BEFORE /:id to prevent Express route collisions
router.get(
  "/me",
  requireRole(USER_ROLES.DOCTOR, USER_ROLES.ADMIN),
  doctorController.getMyDoctorProfile
);

// API 3: GET DOCTOR DETAILS (Role-scoped)
router.get(
  "/:id",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.DOCTOR,
    USER_ROLES.PATIENT
  ),
  doctorController.getDoctor
);

// API 5: UPDATE DOCTOR PROFILE (ADMIN, DOCTOR)
router.patch(
  "/:id",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DOCTOR),
  doctorController.updateDoctor
);

// API 6: ASSIGN PATIENT TO DOCTOR (ADMIN, DOCTOR)
router.patch(
  "/:id/patients",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DOCTOR),
  doctorController.assignPatient
);

// API 7: DOCTOR PATIENT QUEUE (DOCTOR own queue, ADMIN)
router.get(
  "/:id/patients",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DOCTOR),
  doctorController.getDoctorPatients
);

// API 8: DOCTOR AVAILABILITY (DOCTOR own schedule, ADMIN)
router.patch(
  "/:id/availability",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DOCTOR),
  doctorController.updateAvailability
);

// CLINICAL NOTES: RECORD PATIENT NOTE (DOCTOR, ADMIN)
router.post(
  "/:id/notes",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DOCTOR),
  doctorController.addClinicalNote
);

module.exports = router;
