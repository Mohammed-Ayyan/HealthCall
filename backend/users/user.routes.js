/**
 * CareOps AI - User Management Routes
 * 
 * Defines endpoints under /api/v1/users with role-based access control.
 * Protected by authMiddleware and requireRole.
 */

const express = require("express");
const userController = require("./user.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../config/roles");

const router = express.Router();

// Apply authentication middleware to all user management routes
router.use(authMiddleware);

// API 1: GET ALL USERS (ADMIN or DEPARTMENT_MANAGER)
router.get(
  "/",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DEPARTMENT_MANAGER),
  userController.getUsers
);

// API 2: GET SINGLE USER (ADMIN or DEPARTMENT_MANAGER)
router.get(
  "/:id",
  requireRole(USER_ROLES.ADMIN, USER_ROLES.DEPARTMENT_MANAGER),
  userController.getUser
);

// API 3: CREATE USER (ADMIN ONLY)
router.post(
  "/",
  requireRole(USER_ROLES.ADMIN),
  userController.createUser
);

// API 4: UPDATE USER (ADMIN ONLY)
router.patch(
  "/:id",
  requireRole(USER_ROLES.ADMIN),
  userController.updateUser
);

// API 5: CHANGE USER STATUS (ADMIN ONLY)
router.patch(
  "/:id/status",
  requireRole(USER_ROLES.ADMIN),
  userController.changeStatus
);

// API 6: SOFT DELETE USER (ADMIN ONLY)
router.delete(
  "/:id",
  requireRole(USER_ROLES.ADMIN),
  userController.deleteUser
);

module.exports = router;
