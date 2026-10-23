import express, { Application, Request, Response } from "express";
import cors from "cors";
import { callRouter } from "./modules/calls/calls.routes";
import { routingRouter } from "./modules/routing/routing.routes";
import { taskRouter } from "./modules/tasks/tasks.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { errorHandler } from "./middleware/errorHandler";
import { NotFoundError } from "./errors/appError";

export function createApp(): Application {
  const app = express();

  // Standard Middlewares
  app.use(cors());
  app.use(express.json());

  // Root & Healthcheck endpoints
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "workflow-engine",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/v1/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "workflow-engine",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules
  app.use("/api/v1/calls", callRouter);
  app.use("/api/v1/routing", routingRouter);
  app.use("/api/v1/tasks", taskRouter);
  app.use("/api/v1/analytics", analyticsRouter);

  // 404 Handler for undefined routes
  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
