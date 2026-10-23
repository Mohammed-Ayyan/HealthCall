/**
 * CareOps AI - Analytics Routes Layer
 * 
 * Base: /api/v1/analytics
 * 
 * Endpoints:
 *   GET /api/v1/analytics/overview
 *   GET /api/v1/analytics/tasks
 *   GET /api/v1/analytics/patients
 *   GET /api/v1/analytics/users
 */

const express = require("express");
const analyticsController = require("./analytics.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// Analytics access is restricted to hospital administrators and department managers
router.use(authMiddleware);
router.use(requireRole(USER_ROLES.ADMIN, USER_ROLES.DEPARTMENT_MANAGER));

router.get("/overview", analyticsController.getOverview);
router.get("/tasks", analyticsController.getTasks);
router.get("/patients", analyticsController.getPatients);
router.get("/users", analyticsController.getUsers);

module.exports = router;
