import { PrismaClient } from "@prisma/client";
import { config } from "../config/env";

declare global {
  // Prevent multiple instances of Prisma Client in development / HMR
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log:
      config.env === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

if (config.env !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
