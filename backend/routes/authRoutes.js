/**
 * CareOps AI - Authentication & RBAC Routes
 * 
 * Maps endpoints under /api/v1/auth to controller actions and middleware.
 */

const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole, requirePermission } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");
const { PERMISSIONS } = require("../config/permissions");

const router = express.Router();

// Public Authentication Endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Protected Identity Endpoint
router.get("/me", authMiddleware, authController.me);

// RBAC Verification Test Routes (Used by automated integration tests & health checks)
router.get(
  "/admin-only",
  authMiddleware,
  requireRole(USER_ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted to Administrator console",
      user: req.user,
    });
  }
);

router.get(
  "/doctor-only",
  authMiddleware,
  requireRole(USER_ROLES.DOCTOR),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted to Clinical Doctor workspace",
      user: req.user,
    });
  }
);

router.get(
  "/reception-only",
  authMiddleware,
  requireRole(USER_ROLES.RECEPTIONIST),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted to Reception Desk",
      user: req.user,
    });
  }
);

router.get(
  "/insurance-only",
  authMiddleware,
  requireRole(USER_ROLES.INSURANCE_EMPLOYEE),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted to Insurance & Claims division",
      user: req.user,
    });
  }
);

router.get(
  "/manager-only",
  authMiddleware,
  requireRole(USER_ROLES.DEPARTMENT_MANAGER),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted to Department Manager console",
      user: req.user,
    });
  }
);

router.get(
  "/patient-only",
  authMiddleware,
  requireRole(USER_ROLES.PATIENT),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted to Patient portal",
      user: req.user,
    });
  }
);

module.exports = router;
