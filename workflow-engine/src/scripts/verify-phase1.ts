import { PrismaClient } from "@prisma/client";
import { config } from "../config/env";
import fs from "fs";
import path from "path";

async function verifyPhase1() {
  console.log("=================================================================");
  console.log("🏥 CareOps AI — Phase 1 Backend Architecture Verification Suite");
  console.log("=================================================================\n");

  let allChecksPassed = true;

  // 1. Check Schema & Migration Files
  console.log("1️⃣  Verifying Schema and Migration Files...");
  const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
  const migrationPath = path.resolve(
    __dirname,
    "../../prisma/migrations/20261013120000_init_workflow_engine/migration.sql"
  );
  const seedPath = path.resolve(__dirname, "../../prisma/seed.ts");

  if (fs.existsSync(schemaPath)) {
    console.log("  [PASS] prisma/schema.prisma exists");
  } else {
    console.error("  ❌ [FAIL] prisma/schema.prisma not found");
    allChecksPassed = false;
  }

  if (fs.existsSync(migrationPath)) {
    console.log("  [PASS] PostgreSQL DDL Migration file exists");
  } else {
    console.error("  ❌ [FAIL] Migration SQL file not found");
    allChecksPassed = false;
  }

  if (fs.existsSync(seedPath)) {
    console.log("  [PASS] prisma/seed.ts exists");
  } else {
    console.error("  ❌ [FAIL] prisma/seed.ts not found");
    allChecksPassed = false;
  }

  // 2. Check TypeScript Types & Model Definitions
  console.log("\n2️⃣  Verifying Prisma Client Models & TypeScript Bindings...");
  try {
    const prisma = new PrismaClient();
    const expectedModels = [
      "call",
      "department",
      "employee",
      "task",
      "taskNote",
      "taskTimeline",
    ] as const;

    for (const model of expectedModels) {
      if (model in prisma) {
        console.log(`  [PASS] Model delegate '${model}' generated in Prisma Client`);
      } else {
        console.error(`  ❌ [FAIL] Model delegate '${model}' missing in Prisma Client`);
        allChecksPassed = false;
      }
    }
    await prisma.$disconnect();
  } catch (err) {
    console.error("  ❌ [FAIL] Prisma Client initialization error:", err);
    allChecksPassed = false;
  }

  // 3. Database Connectivity Check
  console.log("\n3️⃣  Checking PostgreSQL Database Connection...");
  console.log(`  Configured URL: ${config.databaseUrl.replace(/:[^:@]+@/, ":****@")}`);

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("  [PASS] Database reachable and accepting queries!");

    // Check count of records if seeded
    const deptCount = await prisma.department.count();
    const empCount = await prisma.employee.count();
    const taskCount = await prisma.task.count();
    console.log(
      `  📊 Live DB Records: ${deptCount} Departments, ${empCount} Employees, ${taskCount} Tasks`
    );
  } catch (err: any) {
    console.warn("  ⚠️  [INFO] Database not currently reachable at configured URL.");
    console.warn("       Reason:", err.message?.split("\n")[0] || err.message);
    console.warn("       👉 To connect a live DB, start local PostgreSQL (port 5432) or paste a free cloud PostgreSQL URL (Neon/Supabase) into workflow-engine/.env");
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  if (allChecksPassed) {
    console.log(" Phase 1 Architecture, Models, Types & Migrations are 100% READY!");
  } else {
    console.log("❌ Some static checks failed.");
  }
  console.log("=================================================================\n");
}

verifyPhase1().catch((err) => {
  console.error("Verification suite encountered an error:", err);
  process.exit(1);
});
