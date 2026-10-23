/**
 * CareOps AI - Appointment Routes
 * 
 * Defines endpoints under /api/v1/appointments with authentication and RBAC.
 */

const express = require("express");
const appointmentController = require("./appointment.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

router.use(authMiddleware);
 
// GET /api/v1/appointments
router.get(
  "/",
  requireRole(
    USER_ROLES.PATIENT,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER
  ),
  appointmentController.getAppointments
);

// POST /api/v1/appointments
router.post(
  "/",
  requireRole(
    USER_ROLES.PATIENT,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN,
    USER_ROLES.DOCTOR
  ),
  appointmentController.createAppointment
);

// GET /api/v1/appointments/patient (Convenience alias)
router.get(
  "/patient",
  requireRole(
    USER_ROLES.PATIENT,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER
  ),
  appointmentController.getAppointments
);

// GET /api/v1/appointments/doctor (Convenience alias)
router.get(
  "/doctor",
  requireRole(
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER
  ),
  appointmentController.getAppointments
);

// PATCH /api/v1/appointments/:id/status (Convenience alias)
router.patch(
  "/:id/status",
  requireRole(
    USER_ROLES.PATIENT,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN
  ),
  appointmentController.updateAppointment
);

// PATCH /api/v1/appointments/:id
router.patch(
  "/:id",
  requireRole(
    USER_ROLES.PATIENT,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN
  ),
  appointmentController.updateAppointment
);

// DELETE /api/v1/appointments/:id
router.delete(
  "/:id",
  requireRole(
    USER_ROLES.PATIENT,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.ADMIN
  ),
  appointmentController.deleteAppointment
);

module.exports = router;
