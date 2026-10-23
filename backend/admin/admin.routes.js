/**
 * CareOps AI - Admin Operations & Governance Routes Layer
 * 
 * Base: /api/v1/admin
 * 
 * Endpoints:
 *   GET   /api/v1/admin/overview      (Admin only)
 *   GET   /api/v1/admin/roles         (Admin only)
 *   GET   /api/v1/admin/permissions   (Admin only)
 *   GET   /api/v1/admin/rules         (Admin only)
 *   PATCH /api/v1/admin/rules/:id     (Admin only)
 */

const express = require("express");
const adminController = require("./admin.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// Strict RBAC: All administrative routes require authenticated ADMIN role
router.use(authMiddleware);
router.use(requireRole(USER_ROLES.ADMIN));

router.get("/overview", adminController.getOverview);
router.get("/roles", adminController.getRoles);
router.get("/permissions", adminController.getPermissions);
router.get("/rules", adminController.getRules);
router.patch("/rules/:id", adminController.updateRule);

module.exports = router;
