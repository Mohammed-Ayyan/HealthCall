import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
      code: e.code,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: "Invalid request payload",
        code: "VALIDATION_ERROR",
        details: formattedErrors,
      },
    });
    return;
  }

  // 2. Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.constructor.name,
        details: err.details,
      },
    });
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: Record to update/delete not found
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          message: "Record not found",
          code: "NOT_FOUND",
        },
      });
      return;
    }

    // P2002: Unique constraint violation
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          message: "Resource already exists with unique field conflict",
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          details: err.meta,
        },
      });
      return;
    }
  }

  // 4. Fallback Internal Server Error
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message || "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    },
  });
}
