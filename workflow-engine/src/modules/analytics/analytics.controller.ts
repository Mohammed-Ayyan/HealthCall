import { Request, Response, NextFunction } from "express";
import { analyticsService } from "./analytics.service";

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/overview
   */
  public getOverview = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await analyticsService.getOverviewMetrics();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/departments
   */
  public getDepartments = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await analyticsService.getDepartmentPerformance();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/staff
   */
  public getStaff = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await analyticsService.getStaffWorkload();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/intents
   */
  public getIntents = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await analyticsService.getIntentDistribution();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/escalations
   */
  public getEscalations = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await analyticsService.getEscalationMetrics();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/dashboard
   */
  public getDashboard = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await analyticsService.getDashboard();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const analyticsController = new AnalyticsController();
