/**
 * CareOps AI - Department Routes Layer
 * 
 * Endpoints:
 *   POST   /api/v1/departments       (Admin only)
 *   GET    /api/v1/departments       (Authenticated staff)
 *   GET    /api/v1/departments/:id   (Authenticated staff)
 *   PATCH  /api/v1/departments/:id   (Admin only)
 *   DELETE /api/v1/departments/:id   (Admin only)
 */

const express = require("express");
const departmentController = require("./department.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// All department endpoints require authentication
router.use(authMiddleware);

// Public/Staff read endpoints
router.get("/", departmentController.list);
router.get("/:id", departmentController.getById);

// Admin-only mutation endpoints
router.post("/", requireRole(USER_ROLES.ADMIN), departmentController.create);
router.patch("/:id", requireRole(USER_ROLES.ADMIN), departmentController.update);
router.delete("/:id", requireRole(USER_ROLES.ADMIN), departmentController.delete);

module.exports = router;
