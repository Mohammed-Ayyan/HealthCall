import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { slaService } from "../src/modules/sla/sla.service";
import { taskRepository } from "../src/modules/tasks/tasks.repository";
import { Priority, TaskStatus } from "@prisma/client";

describe("Phase 6: SLA Deadline Tracking Engine", () => {
  const baseTime = new Date("2026-10-13T10:00:00.000Z");

  // =========================================================================
  // 1. Deadline Calculation for Priority Tiers
  // =========================================================================
  describe("Deadline Calculation (calculateDeadline)", () => {
    it("should calculate 15-minute SLA deadline for URGENT priority", () => {
      const deadline = slaService.calculateDeadline(baseTime, Priority.URGENT);
      const expected = new Date("2026-10-13T10:15:00.000Z");
      assert.equal(deadline.getTime(), expected.getTime());
    });

    it("should calculate 2-hour SLA deadline for HIGH priority", () => {
      const deadline = slaService.calculateDeadline(baseTime, Priority.HIGH);
      const expected = new Date("2026-10-13T12:00:00.000Z");
      assert.equal(deadline.getTime(), expected.getTime());
    });

    it("should calculate 4-hour SLA deadline for MEDIUM priority", () => {
      const deadline = slaService.calculateDeadline(baseTime, Priority.MEDIUM);
      const expected = new Date("2026-10-13T14:00:00.000Z");
      assert.equal(deadline.getTime(), expected.getTime());
    });

    it("should calculate 24-hour SLA deadline for LOW priority", () => {
      const deadline = slaService.calculateDeadline(baseTime, Priority.LOW);
      const expected = new Date("2026-10-14T10:00:00.000Z");
      assert.equal(deadline.getTime(), expected.getTime());
    });
  });

  // =========================================================================
  // 2. SLA Health Status Evaluator Transitions
  // =========================================================================
  describe("SLA Health Status Evaluator (evaluateSLA)", () => {
    const deadline = new Date("2026-10-13T12:00:00.000Z"); // 2 hour window

    it("should return ON_TRACK when active task has > 30 minutes remaining", () => {
      // 1 hour remaining before deadline
      const checkTime = new Date("2026-10-13T11:00:00.000Z");
      const metrics = slaService.evaluateSLA(
        {
          createdAt: baseTime,
          deadlineAt: deadline,
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
        },
        checkTime
      );

      assert.equal(metrics.healthStatus, "ON_TRACK");
      assert.equal(metrics.remainingMinutes, 60);
      assert.equal(metrics.elapsedMinutes, 60);
    });

    it("should return NEAR_BREACH when active task has exactly 30 minutes remaining", () => {
      const checkTime = new Date("2026-10-13T11:30:00.000Z");
      const metrics = slaService.evaluateSLA(
        {
          createdAt: baseTime,
          deadlineAt: deadline,
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
        },
        checkTime
      );

      assert.equal(metrics.healthStatus, "NEAR_BREACH");
      assert.equal(metrics.remainingMinutes, 30);
      assert.equal(metrics.elapsedMinutes, 90);
    });

    it("should return NEAR_BREACH when active task has 10 minutes remaining", () => {
      const checkTime = new Date("2026-10-13T11:50:00.000Z");
      const metrics = slaService.evaluateSLA(
        {
          createdAt: baseTime,
          deadlineAt: deadline,
          status: TaskStatus.ASSIGNED,
          priority: Priority.HIGH,
        },
        checkTime
      );

      assert.equal(metrics.healthStatus, "NEAR_BREACH");
      assert.equal(metrics.remainingMinutes, 10);
      assert.equal(metrics.elapsedMinutes, 110);
    });

    it("should return BREACHED when reference time is past deadline", () => {
      // 15 minutes past deadline
      const checkTime = new Date("2026-10-13T12:15:00.000Z");
      const metrics = slaService.evaluateSLA(
        {
          createdAt: baseTime,
          deadlineAt: deadline,
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
        },
        checkTime
      );

      assert.equal(metrics.healthStatus, "BREACHED");
      assert.equal(metrics.remainingMinutes, -15);
      assert.equal(metrics.elapsedMinutes, 135);
    });

    it("should return COMPLETED_ON_TIME when completed before deadline", () => {
      const completedTime = new Date("2026-10-13T11:45:00.000Z");
      const metrics = slaService.evaluateSLA({
        createdAt: baseTime,
        deadlineAt: deadline,
        completedAt: completedTime,
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
      });

      assert.equal(metrics.healthStatus, "COMPLETED_ON_TIME");
      assert.equal(metrics.remainingMinutes, 15);
      assert.equal(metrics.elapsedMinutes, 105);
    });

    it("should return COMPLETED_ON_TIME when completed exactly at deadline", () => {
      const metrics = slaService.evaluateSLA({
        createdAt: baseTime,
        deadlineAt: deadline,
        completedAt: deadline,
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
      });

      assert.equal(metrics.healthStatus, "COMPLETED_ON_TIME");
      assert.equal(metrics.remainingMinutes, 0);
      assert.equal(metrics.elapsedMinutes, 120);
    });

    it("should return COMPLETED_BREACHED when completed after deadline", () => {
      const completedTime = new Date("2026-10-13T12:30:00.000Z"); // 30m late
      const metrics = slaService.evaluateSLA({
        createdAt: baseTime,
        deadlineAt: deadline,
        completedAt: completedTime,
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
      });

      assert.equal(metrics.healthStatus, "COMPLETED_BREACHED");
      assert.equal(metrics.remainingMinutes, -30);
      assert.equal(metrics.elapsedMinutes, 150);
    });

    it("should handle completed task when completedAt is omitted, falling back to referenceTime", () => {
      const refTime = new Date("2026-10-13T11:15:00.000Z");
      const metrics = slaService.evaluateSLA(
        {
          createdAt: baseTime,
          deadlineAt: deadline,
          completedAt: null,
          status: TaskStatus.COMPLETED,
          priority: Priority.HIGH,
        },
        refTime
      );

      assert.equal(metrics.healthStatus, "COMPLETED_ON_TIME");
      assert.equal(metrics.remainingMinutes, 45);
    });

    it("should calculate deadline dynamically if deadlineAt is missing", () => {
      const refTime = new Date("2026-10-13T10:05:00.000Z");
      const metrics = slaService.evaluateSLA(
        {
          createdAt: baseTime,
          deadlineAt: null,
          status: TaskStatus.PENDING,
          priority: Priority.URGENT, // 15 mins -> 10:15
        },
        refTime
      );

      assert.equal(metrics.healthStatus, "NEAR_BREACH"); // 10 mins remaining <= 30
      assert.equal(metrics.remainingMinutes, 10);
      assert.equal(metrics.deadlineAt, new Date("2026-10-13T10:15:00.000Z").toISOString());
    });
  });

  // =========================================================================
  // 3. HTTP Integration with Task Queries
  // =========================================================================
  describe("HTTP Query Integration & SLA Enriched Responses", () => {
    const originalFindMany = taskRepository.findMany.bind(taskRepository);
    const originalFindById = taskRepository.findById.bind(taskRepository);

    const taskId = "123e4567-e89b-12d3-a456-426614174001";
    const mockTasks = [
      {
        id: taskId,
        callId: "123e4567-e89b-12d3-a456-426614174000",
        departmentId: "123e4567-e89b-12d3-a456-426614174002",
        assignedEmployeeId: "123e4567-e89b-12d3-a456-426614174003",
        title: "Urgent Lab Review",
        description: "Review abnormal blood test",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        createdAt: new Date("2026-10-13T10:00:00.000Z"),
        assignedAt: new Date("2026-10-13T10:05:00.000Z"),
        deadlineAt: new Date(Date.now() + 60 * 60 * 1000), // > 30m -> ON_TRACK
        completedAt: null,
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174004",
        callId: "123e4567-e89b-12d3-a456-426614174000",
        departmentId: "123e4567-e89b-12d3-a456-426614174002",
        assignedEmployeeId: null,
        title: "Overdue Follow-up",
        description: "Follow up overdue",
        status: TaskStatus.PENDING,
        priority: Priority.URGENT,
        createdAt: new Date("2026-10-13T08:00:00.000Z"),
        assignedAt: null,
        deadlineAt: new Date(Date.now() - 30 * 60 * 1000), // past deadline -> BREACHED
        completedAt: null,
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174005",
        callId: "123e4567-e89b-12d3-a456-426614174000",
        departmentId: "123e4567-e89b-12d3-a456-426614174002",
        assignedEmployeeId: "123e4567-e89b-12d3-a456-426614174003",
        title: "Near Deadline Review",
        description: "Review expiring soon",
        status: TaskStatus.ASSIGNED,
        priority: Priority.MEDIUM,
        createdAt: new Date("2026-10-13T09:00:00.000Z"),
        assignedAt: new Date("2026-10-13T09:15:00.000Z"),
        deadlineAt: new Date(Date.now() + 15 * 60 * 1000), // <= 30m -> NEAR_BREACH
        completedAt: null,
      },
    ];

    beforeEach(() => {
      taskRepository.findMany = async () => ({
        tasks: mockTasks as any,
        total: mockTasks.length,
      });

      taskRepository.findById = async (id: string) => {
        const found = mockTasks.find((t) => t.id === id);
        return (found || null) as any;
      };
    });

    afterEach(() => {
      taskRepository.findMany = originalFindMany;
      taskRepository.findById = originalFindById;
    });

    it("should accept valid slaStatus query parameter (ON_TRACK) and filter items", async () => {
      const res = await request(app).get("/api/v1/tasks?slaStatus=ON_TRACK");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].sla.healthStatus, "ON_TRACK");
    });

    it("should accept valid slaStatus query parameter (BREACHED) and filter items", async () => {
      const res = await request(app).get("/api/v1/tasks?slaStatus=BREACHED");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].sla.healthStatus, "BREACHED");
    });

    it("should accept valid slaStatus query parameter (NEAR_BREACH) and filter items", async () => {
      const res = await request(app).get("/api/v1/tasks?slaStatus=NEAR_BREACH");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].sla.healthStatus, "NEAR_BREACH");
    });

    it("should append complete SLA object to GET /api/v1/tasks/:id response", async () => {
      const res = await request(app).get(`/api/v1/tasks/${taskId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.sla);

      const { sla } = res.body.data;
      assert.equal(typeof sla.createdAt, "string");
      assert.equal(typeof sla.assignedAt, "string");
      assert.equal(typeof sla.deadlineAt, "string");
      assert.equal(sla.completedAt, null);
      assert.equal(sla.healthStatus, "ON_TRACK");
      assert.equal(typeof sla.remainingMinutes, "number");
      assert.equal(typeof sla.elapsedMinutes, "number");
    });

    it("should reject invalid slaStatus with 400 Bad Request", async () => {
      const res = await request(app).get("/api/v1/tasks?slaStatus=INVALID_STATUS");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
