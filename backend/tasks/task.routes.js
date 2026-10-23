/**
 * CareOps AI - Task Management Routes
 * 
 * Endpoints under /api/v1/tasks protected by authMiddleware and requireRole guards.
 */

const express = require("express");
const taskController = require("./task.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

const router = express.Router();

// Optional authentication for incoming telephony/AI pipeline webhook
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1].trim();
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || "",
        };
      }
    } catch {}
  }
  next();
}

// API 0: CREATE TASKS FROM CALL INTELLIGENCE (Telephony / Simulator pipeline)
router.post("/from-call", optionalAuth, taskController.createTasksFromCall);

// Enforce authentication across all standard task endpoints
router.use(authMiddleware);

// API 1: CREATE TASK
// Internal hospital staff only (Patients are blocked by requireRole and service validation)
router.post(
  "/",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.DOCTOR,
    USER_ROLES.INSURANCE_EMPLOYEE
  ),
  taskController.createTask
);

// API 2: GET TASKS (Role-scoped)
router.get(
  "/",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.PATIENT
  ),
  taskController.getTasks
);

// API 3: GET SINGLE TASK
router.get(
  "/:id",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.INSURANCE_EMPLOYEE,
    USER_ROLES.PATIENT
  ),
  taskController.getTask
);

// API 4: ASSIGN TASK (ADMIN & DEPARTMENT_MANAGER only)
router.patch(
  "/:id/assign",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DEPARTMENT_MANAGER),
  taskController.assignTask
);

// API 5: UPDATE TASK STATUS
router.patch(
  "/:id/status",
  requireRole(
    USER_ROLES.ADMIN,
    USER_ROLES.DEPARTMENT_MANAGER,
    USER_ROLES.DOCTOR,
    USER_ROLES.RECEPTIONIST,
    USER_ROLES.INSURANCE_EMPLOYEE
  ),
  taskController.updateTaskStatus
);

// API 6: DELETE / CLOSE TASK (ADMIN & DEPARTMENT_MANAGER only)
router.delete(
  "/:id",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DEPARTMENT_MANAGER),
  taskController.deleteTask
);

module.exports = router;
