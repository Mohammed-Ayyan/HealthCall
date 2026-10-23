/**
 * CareOps AI - Analytics Controller Layer
 */

const analyticsService = require("./analytics.service");

class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const data = await analyticsService.getOverview();
      return res.status(200).json({
        success: true,
        data,
        ...data, // Top-level accessibility for convenience
      });
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req, res, next) {
    try {
      const data = await analyticsService.getTaskAnalytics();
      return res.status(200).json({
        success: true,
        data,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPatients(req, res, next) {
    try {
      const data = await analyticsService.getPatientAnalytics();
      return res.status(200).json({
        success: true,
        data,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const data = await analyticsService.getUserAnalytics();
      return res.status(200).json({
        success: true,
        data,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
