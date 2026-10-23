import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { routingService } from "../src/modules/routing/routing.service";

describe("Phase 3: Automatic Department Routing Engine", () => {
  // =========================================================================
  // 1. Service Layer: Intent Category Routing Rules
  // =========================================================================
  describe("Department Routing Service Rules", () => {
    describe("Appointment Intents -> Reception (MEDIUM, 4h)", () => {
      const appointmentIntents = [
        "appointment",
        "appointment_booking",
        "reschedule",
        "cancellation",
        "cancel",
        "schedule",
        "book_appointment",
      ];

      for (const intent of appointmentIntents) {
        it(`should route intent '${intent}' to 'reception'`, () => {
          const result = routingService.evaluate({ intent });
          assert.equal(result.department_id, "reception");
          assert.equal(result.department_name, "Reception Team");
          assert.equal(result.default_priority, "MEDIUM");
          assert.equal(result.sla_hours, 4);
        });
      }
    });

    describe("Insurance Intents -> Insurance Department (HIGH, 2h)", () => {
      const insuranceIntents = [
        "insurance",
        "insurance_verification",
        "prior_auth",
        "prior_authorization",
        "claim_inquiry",
        "claim",
      ];

      for (const intent of insuranceIntents) {
        it(`should route intent '${intent}' to 'insurance'`, () => {
          const result = routingService.evaluate({ intent });
          assert.equal(result.department_id, "insurance");
          assert.equal(result.department_name, "Insurance Department");
          assert.equal(result.default_priority, "HIGH");
          assert.equal(result.sla_hours, 2);
        });
      }
    });

    describe("Complaint & Billing Intents -> Customer Support (MEDIUM, 6h)", () => {
      const complaintIntents = [
        "complaint",
        "billing",
        "billing_dispute",
        "feedback",
        "invoice",
        "charge_dispute",
      ];

      for (const intent of complaintIntents) {
        it(`should route intent '${intent}' to 'customer_support'`, () => {
          const result = routingService.evaluate({ intent });
          assert.equal(result.department_id, "customer_support");
          assert.equal(result.department_name, "Customer Support");
          assert.equal(result.default_priority, "MEDIUM");
          assert.equal(result.sla_hours, 6);
        });
      }
    });

    describe("Emergency & Critical Triage -> Clinical Triage (URGENT, 0.25h / 15 min)", () => {
      const emergencyIntents = [
        "emergency",
        "critical_symptoms",
        "critical",
        "triage",
        "chest_pain",
      ];

      for (const intent of emergencyIntents) {
        it(`should route emergency intent '${intent}' to 'clinical_triage'`, () => {
          const result = routingService.evaluate({ intent });
          assert.equal(result.department_id, "clinical_triage");
          assert.equal(result.department_name, "Clinical Triage");
          assert.equal(result.default_priority, "URGENT");
          assert.equal(result.sla_hours, 0.25);
        });
      }

      it("should elevate any intent to clinical_triage if sentiment is CRITICAL", () => {
        const result = routingService.evaluate({
          intent: "general_question",
          sentiment: "CRITICAL",
        });
        assert.equal(result.department_id, "clinical_triage");
        assert.equal(result.default_priority, "URGENT");
        assert.equal(result.sla_hours, 0.25);
      });
    });

    describe("Fallback Behavior for Unrecognized Intents -> Reception (HIGH, 2h)", () => {
      const unrecognizedIntents = [
        "alien_encounter",
        "unknown_intent_123",
        "lost_item",
        "random_inquiry",
      ];

      for (const intent of unrecognizedIntents) {
        it(`should fallback unexpected intent '${intent}' to 'reception'`, () => {
          const result = routingService.evaluate({ intent });
          assert.equal(result.department_id, "reception");
          assert.equal(result.department_name, "Reception Team");
          assert.equal(result.default_priority, "HIGH");
          assert.equal(result.sla_hours, 2);
        });
      }

      it("should safely fallback empty intent to 'reception'", () => {
        const result = routingService.evaluate({ intent: "" });
        assert.equal(result.department_id, "reception");
        assert.equal(result.default_priority, "HIGH");
        assert.equal(result.sla_hours, 2);
      });
    });

    describe("Normalization: Case-insensitivity & Whitespace Trimming", () => {
      it("should handle uppercase intents", () => {
        const result = routingService.evaluate({ intent: "APPOINTMENT_BOOKING" });
        assert.equal(result.department_id, "reception");
      });

      it("should handle mixed case and leading/trailing whitespace", () => {
        const result = routingService.evaluate({ intent: "  iNsUrAnCe_vErIfIcAtIoN   " });
        assert.equal(result.department_id, "insurance");
      });

      it("should normalize space-separated words to underscores", () => {
        const result = routingService.evaluate({ intent: "billing dispute" });
        assert.equal(result.department_id, "customer_support");
      });
    });
  });

  // =========================================================================
  // 2. HTTP API: POST /api/v1/routing/evaluate
  // =========================================================================
  describe("API Endpoint: POST /api/v1/routing/evaluate", () => {
    it("should return 200 OK with accurate routing metadata for appointment intent", async () => {
      const res = await request(app)
        .post("/api/v1/routing/evaluate")
        .send({ intent: "appointment_booking" });

      assert.equal(res.status, 200);
      assert.equal(res.body.department_id, "reception");
      assert.equal(res.body.department_name, "Reception Team");
      assert.equal(res.body.default_priority, "MEDIUM");
      assert.equal(res.body.sla_hours, 4);
      assert.ok(typeof res.body.matched_intent === "string");
    });

    it("should return 200 OK with accurate routing metadata for prior_auth intent", async () => {
      const res = await request(app)
        .post("/api/v1/routing/evaluate")
        .send({ intent: "prior_auth", priority: "HIGH" });

      assert.equal(res.status, 200);
      assert.equal(res.body.department_id, "insurance");
      assert.equal(res.body.department_name, "Insurance Department");
      assert.equal(res.body.default_priority, "HIGH");
      assert.equal(res.body.sla_hours, 2);
    });

    it("should return 200 OK with accurate routing metadata for critical triage intent", async () => {
      const res = await request(app)
        .post("/api/v1/routing/evaluate")
        .send({ intent: "critical_symptoms" });

      assert.equal(res.status, 200);
      assert.equal(res.body.department_id, "clinical_triage");
      assert.equal(res.body.department_name, "Clinical Triage");
      assert.equal(res.body.default_priority, "URGENT");
      assert.equal(res.body.sla_hours, 0.25);
    });

    it("should return 200 OK with fallback routing for unrecognized intent", async () => {
      const res = await request(app)
        .post("/api/v1/routing/evaluate")
        .send({ intent: "completely_unrecognized_query" });

      assert.equal(res.status, 200);
      assert.equal(res.body.department_id, "reception");
      assert.equal(res.body.department_name, "Reception Team");
      assert.equal(res.body.default_priority, "HIGH");
      assert.equal(res.body.sla_hours, 2);
    });

    it("should return 400 Bad Request when intent field is missing", async () => {
      const res = await request(app)
        .post("/api/v1/routing/evaluate")
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("should return 400 Bad Request when intent is empty string", async () => {
      const res = await request(app)
        .post("/api/v1/routing/evaluate")
        .send({ intent: "" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
