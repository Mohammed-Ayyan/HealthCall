import dotenv from "dotenv";
import path from "path";

// Ensure .env is loaded from the workflow-engine root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/careops_db?schema=public",
} as const;

export default config;
