/**
 * CareOps AI - Role Authorization Middleware
 * 
 * Enforces Role-Based Access Control (RBAC) on protected endpoints.
 * Blocks requests from users whose role does not match the permitted set.
 */

const { USER_ROLES, normalizeRole } = require("../config/roles");
const { hasPermission } = require("../config/permissions");

/**
 * Restricts route access to one or more permitted roles.
 * Usage:
 *   requireRole("ADMIN")
 *   requireRole("DOCTOR", "ADMIN")
 *   requireRole(["PATIENT", "DOCTOR"])
 * 
 * @param  {...string|string[]} roles 
 * @returns {Function} Express middleware function
 */
function requireRole(...roles) {
  // Flatten array in case an array was passed as single argument
  const allowedRoles = roles
    .flat()
    .map((r) => normalizeRole(r) || r);

  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = normalizeRole(req.user.role) || req.user.role;

    // Check if user has one of the allowed roles (ADMIN always has global authority unless restricted)
    const isAllowed =
      allowedRoles.includes(userRole) ||
      (allowedRoles.length > 0 && userRole === USER_ROLES.ADMIN);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission",
      });
    }

    next();
  };
}

/**
 * Restricts route access based on specific operational capability
 * @param {string} permission 
 * @returns {Function} Express middleware function
 */
function requirePermission(permission) {
  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = normalizeRole(req.user.role) || req.user.role;

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission",
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requirePermission,
};
