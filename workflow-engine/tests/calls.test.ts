import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { CallService } from "../src/modules/calls/calls.service";
import { CallRepository } from "../src/modules/calls/calls.repository";
import {
  createCallSchema,
  updateCallSchema,
  callIdParamSchema,
  listCallsQuerySchema,
} from "../src/modules/calls/calls.validation";
import { NotFoundError } from "../src/errors/appError";
import { Priority, Sentiment } from "@prisma/client";

describe("Phase 2: Call Management System", () => {
  // =========================================================================
  // 1. Zod Validation Unit Tests
  // =========================================================================
  describe("Request Validation Schemas", () => {
    it("should validate and parse a valid CreateCall payload", async () => {
      const validPayload = {
        patientName: "Jane Doe",
        patientPhone: "+15551234567",
        patientMrn: "MRN-12345",
        transcript: "Patient requested cardiology follow up",
        summary: "Cardiology follow up request",
        detectedIntent: "CARDIOLOGY_FOLLOW_UP",
        priority: "HIGH",
        sentiment: "NEUTRAL",
      };

      const parsed = await createCallSchema.parseAsync(validPayload);
      assert.equal(parsed.patientName, "Jane Doe");
      assert.equal(parsed.patientPhone, "+15551234567");
      assert.equal(parsed.priority, Priority.HIGH);
      assert.equal(parsed.sentiment, Sentiment.NEUTRAL);
      assert.ok(parsed.callTimestamp instanceof Date);
    });

    it("should accept snake_case aliases in CreateCall payload", async () => {
      const snakePayload = {
        patient_name: "John Smith",
        patient_phone: "+15559876543",
        patient_mrn: "MRN-99887",
        transcript: "Prescription refill needed",
        summary: "Refill request",
        detected_intent: "PRESCRIPTION_REFILL",
        priority: "MEDIUM",
        sentiment: "POSITIVE",
      };

      const parsed = await createCallSchema.parseAsync(snakePayload);
      assert.equal(parsed.patientName, "John Smith");
      assert.equal(parsed.patientPhone, "+15559876543");
      assert.equal(parsed.detectedIntent, "PRESCRIPTION_REFILL");
    });

    it("should reject invalid priority enum value", async () => {
      const invalidPayload = {
        patientName: "Jane Doe",
        patientPhone: "+15551234567",
        transcript: "Transcript...",
        summary: "Summary...",
        detectedIntent: "INTENT",
        priority: "CRITICAL", // CRITICAL is a sentiment, NOT a valid priority
        sentiment: "NEUTRAL",
      };

      await assert.rejects(async () => {
        await createCallSchema.parseAsync(invalidPayload);
      });
    });

    it("should reject invalid sentiment enum value", async () => {
      const invalidPayload = {
        patientName: "Jane Doe",
        patientPhone: "+15551234567",
        transcript: "Transcript...",
        summary: "Summary...",
        detectedIntent: "INTENT",
        priority: "HIGH",
        sentiment: "HAPPY", // Invalid sentiment
      };

      await assert.rejects(async () => {
        await createCallSchema.parseAsync(invalidPayload);
      });
    });

    it("should reject CreateCall when required fields are missing", async () => {
      const missingPayload = {
        patientName: "Jane Doe",
        // missing patientPhone, transcript, summary, etc.
        priority: "LOW",
        sentiment: "POSITIVE",
      };

      await assert.rejects(async () => {
        await createCallSchema.parseAsync(missingPayload);
      });
    });

    it("should validate valid UUID params and reject non-UUID", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const parsed = await callIdParamSchema.parseAsync({ id: validUuid });
      assert.equal(parsed.id, validUuid);

      await assert.rejects(async () => {
        await callIdParamSchema.parseAsync({ id: "invalid-uuid-1234" });
      });
    });

    it("should reject empty UpdateCall payload", async () => {
      await assert.rejects(async () => {
        await updateCallSchema.parseAsync({});
      });
    });

    it("should parse and provide default pagination values for ListCalls", async () => {
      const query = await listCallsQuerySchema.parseAsync({});
      assert.equal(query.page, 1);
      assert.equal(query.limit, 20);
    });
  });

  // =========================================================================
  // 2. Service Layer Unit Tests
  // =========================================================================
  describe("CallService Business Logic", () => {
    it("should throw NotFoundError when fetching non-existent call by ID", async () => {
      const mockRepo = {
        findById: async () => null,
      } as unknown as CallRepository;

      const service = new CallService(mockRepo);
      await assert.rejects(
        async () => {
          await service.getCallById("00000000-0000-0000-0000-000000000000");
        },
        (err: Error) => {
          assert.ok(err instanceof NotFoundError);
          assert.equal(err.message, "Call with ID '00000000-0000-0000-0000-000000000000' not found");
          return true;
        }
      );
    });

    it("should return formatted pagination metadata in listCalls", async () => {
      const mockCalls = [
        { id: "call-1", patientName: "Patient A" },
        { id: "call-2", patientName: "Patient B" },
      ];

      const mockRepo = {
        findMany: async () => ({ calls: mockCalls, total: 45 }),
      } as unknown as CallRepository;

      const service = new CallService(mockRepo);
      const result = await service.listCalls({
        page: 2,
        limit: 10,
        patientPhone: undefined,
        detectedIntent: undefined,
        priority: undefined,
        sentiment: undefined,
      });

      assert.equal(result.data.length, 2);
      assert.equal(result.meta.total, 45);
      assert.equal(result.meta.page, 2);
      assert.equal(result.meta.limit, 10);
      assert.equal(result.meta.totalPages, 5);
      assert.equal(result.meta.hasNextPage, true);
      assert.equal(result.meta.hasPrevPage, true);
    });
  });

  // =========================================================================
  // 3. HTTP Integration & Route Tests
  // =========================================================================
  describe("Express HTTP Endpoints & Middleware", () => {
    it("GET /health should return 200 OK", async () => {
      const res = await request(app).get("/health");
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "ok");
      assert.equal(res.body.service, "workflow-engine");
    });

    it("GET /api/v1/health should return 200 OK with version", async () => {
      const res = await request(app).get("/api/v1/health");
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "ok");
      assert.equal(res.body.version, "1.0.0");
    });

    it("GET /api/v1/nonexistent should return 404 with standard error format", async () => {
      const res = await request(app).get("/api/v1/nonexistent");
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "NotFoundError");
    });

    it("POST /api/v1/calls with invalid payload should return 400 Bad Request with details", async () => {
      const res = await request(app)
        .post("/api/v1/calls")
        .send({
          patientName: "John",
          // Missing required fields
          priority: "INVALID_PRIORITY",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.ok(Array.isArray(res.body.error.details));
      assert.ok(res.body.error.details.length > 0);
    });

    it("GET /api/v1/calls/:id with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app).get("/api/v1/calls/not-a-valid-uuid");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("PATCH /api/v1/calls/:id with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app)
        .patch("/api/v1/calls/not-a-valid-uuid")
        .send({ summary: "Updated summary" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("DELETE /api/v1/calls/:id with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app).delete("/api/v1/calls/12345");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
