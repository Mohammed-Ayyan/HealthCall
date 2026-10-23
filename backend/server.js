/**
 * CareOps AI - Backend HTTP Server Entrypoint
 * 
 * Boots environment configuration, establishes database connection,
 * and starts HTTP server listener.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");
const User = require("./models/User");
const seedDatabase = require("./scripts/seedDatabase");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Auto-seed demo accounts if database is fresh
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log("[CareOps] Fresh database detected. Auto-provisioning demo profiles...");
        await seedDatabase();
      }
    } catch (seedErr) {
      console.warn("[CareOps] Auto-seed note:", seedErr.message);
    }

    // 3. Start Express HTTP listener
    const server = app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` CareOps AI - Backend Authentication & RBAC Engine`);
      console.log(` Server running on: http://localhost:${PORT}`);
      console.log(` Health Check:     http://localhost:${PORT}/api/v1/health`);
      console.log(` Auth Endpoint:    http://localhost:${PORT}/api/v1/auth`);
      console.log(` Environment:      ${process.env.NODE_ENV || "development"}`);
      console.log(`==================================================`);
    });

    // 3. Graceful termination handler
    const gracefulShutdown = async (signal) => {
      console.log(`\n[CareOps] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log("[CareOps] HTTP server closed and database disconnected.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("[CareOps Startup Error]:", error);
    process.exit(1);
  }
}

// Only start when invoked directly, not when required by testing frameworks
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
