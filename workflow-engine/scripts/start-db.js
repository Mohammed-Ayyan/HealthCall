const fs = require("fs");
const path = require("path");
const EmbeddedPostgres = require("embedded-postgres").default;

const dataDir = path.join(__dirname, "..", ".pg-data");
const port = 5432;

async function start() {
  const pg = new EmbeddedPostgres({
    port,
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    persistent: true,
  });

  const isInitialised = fs.existsSync(path.join(dataDir, "PG_VERSION"));
  if (!isInitialised) {
    console.log("📦 Initializing local embedded PostgreSQL cluster...");
    await pg.initialise();
  }

  console.log(`🚀 Starting local PostgreSQL on port ${port}...`);
  await pg.start();

  try {
    await pg.createDatabase("careops_db");
    console.log(" Database 'careops_db' verified/created.");
  } catch (err) {
    // Database already exists
  }

  console.log(` PostgreSQL ready and listening on localhost:${port}!`);
  console.log(` Connection string: postgresql://postgres:postgres@localhost:5432/careops_db?schema=public`);

  // Keep process alive until termination signal
  process.on("SIGINT", async () => {
    console.log("\n🛑 Stopping PostgreSQL...");
    try {
      await pg.stop();
    } catch (_) {}
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Stopping PostgreSQL...");
    try {
      await pg.stop();
    } catch (_) {}
    process.exit(0);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start embedded PostgreSQL:", err);
  process.exit(1);
});
