/**
 * CareOps AI - Admin Operations Controller Layer
 */

const adminService = require("./admin.service");

class AdminController {
  /**
   * GET /api/v1/admin/overview
   */
  async getOverview(req, res, next) {
    try {
      const overview = await adminService.getHospitalOverview(req.user);
      return res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/roles
   */
  async getRoles(req, res, next) {
    try {
      const roles = await adminService.getRolesGovernance();
      return res.status(200).json({
        success: true,
        count: roles.length,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/permissions
   */
  async getPermissions(req, res, next) {
    try {
      const permissions = await adminService.getPermissionsGovernance();
      return res.status(200).json({
        success: true,
        count: permissions.length,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/rules
   */
  async getRules(req, res, next) {
    try {
      const rules = await adminService.getSystemRules();
      return res.status(200).json({
        success: true,
        count: rules.length,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/rules/:id
   */
  async updateRule(req, res, next) {
    try {
      const updated = await adminService.updateSystemRule(req.params.id, req.body, req.user?.id);
      return res.status(200).json({
        success: true,
        message: "System governance rule updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
