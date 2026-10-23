import { Router } from "express";
import { analyticsController } from "./analytics.controller";

const router = Router();

// GET /api/v1/analytics/overview - Hospital-wide summary & SLA compliance
router.get("/overview", analyticsController.getOverview);

// GET /api/v1/analytics/departments - Departmental performance & workload
router.get("/departments", analyticsController.getDepartments);

// GET /api/v1/analytics/staff - Staff workload distribution
router.get("/staff", analyticsController.getStaff);

// GET /api/v1/analytics/intents - Telephony intent distribution
router.get("/intents", analyticsController.getIntents);

// GET /api/v1/analytics/escalations - Escalation tier metrics
router.get("/escalations", analyticsController.getEscalations);

// GET /api/v1/analytics/dashboard - Comprehensive aggregated dashboard
router.get("/dashboard", analyticsController.getDashboard);

export const analyticsRouter = router;
