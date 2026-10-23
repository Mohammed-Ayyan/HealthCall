import http from "http";
import { app } from "./app";
import { prisma } from "./db/client";
import { config } from "./config/env";
import * as types from "./types";
import { escalationScheduler } from "./modules/escalation/escalation.scheduler";
import { auditService } from "./modules/audit/audit.service";
import { analyticsService } from "./modules/analytics/analytics.service";

export { app, prisma, config, types, escalationScheduler, auditService, analyticsService };

/**
 * Health check to verify database connectivity.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Application Bootstrap / Service Entry
 */
export async function startServer(): Promise<http.Server> {
  console.log("==================================================");
  console.log("🏥 CareOps AI - Healthcare Workflow Engine Backend");
  console.log(`📡 Environment: ${config.env}`);
  console.log(`🔌 Configured Port: ${config.port}`);
  console.log("==================================================");

  const isHealthy = await checkDatabaseHealth();
  if (isHealthy) {
    console.log(" Database connection verified successfully.");
  } else {
    console.warn("⚠️  PostgreSQL is not currently reachable. CRUD operations will require an active database.");
  }

  // Start Phase 7 Background SLA Breach & Escalation Monitor
  escalationScheduler.start();

  const server = app.listen(config.port, () => {
    console.log(` HTTP Server listening at http://localhost:${config.port}`);
    console.log(`📞 Call Management API: http://localhost:${config.port}/api/v1/calls`);
    console.log(`🩺 Health check: http://localhost:${config.port}/health`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log("\n🛑 Gracefully shutting down workflow engine server...");
    escalationScheduler.stop();
    server.close(() => {
      prisma.$disconnect().finally(() => {
        process.exit(0);
      });
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Fatal error during bootstrap:", err);
    process.exit(1);
  });
}
