import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { TaskStateMachine } from "../src/modules/tasks/tasks.state-machine";
import { TaskService } from "../src/modules/tasks/tasks.service";
import { TaskRepository } from "../src/modules/tasks/tasks.repository";
import { TaskStatus } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../src/errors/appError";

describe("Phase 4: Action & Task Management Core", () => {
  const sampleEmployeeId = "11111111-1111-1111-1111-111111111111";

  // =========================================================================
  // 1. Task State Machine Transition Validation Rules
  // =========================================================================
  describe("Task State Machine Governance", () => {
    describe("Valid Status Transitions", () => {
      it("should permit PENDING -> ASSIGNED", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.PENDING,
            targetStatus: TaskStatus.ASSIGNED,
            assignedEmployeeId: sampleEmployeeId,
          });
        });
      });

      it("should permit PENDING -> CANCELLED with reason", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.PENDING,
            targetStatus: TaskStatus.CANCELLED,
            assignedEmployeeId: null,
            reason: "Patient called back and cancelled visit",
          });
        });
      });

      it("should permit ASSIGNED -> IN_PROGRESS with assigned employee", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.ASSIGNED,
            targetStatus: TaskStatus.IN_PROGRESS,
            assignedEmployeeId: sampleEmployeeId,
          });
        });
      });

      it("should permit ASSIGNED -> PENDING (unassigning)", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.ASSIGNED,
            targetStatus: TaskStatus.PENDING,
            assignedEmployeeId: sampleEmployeeId,
          });
        });
      });

      it("should permit ASSIGNED -> CANCELLED with reason", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.ASSIGNED,
            targetStatus: TaskStatus.CANCELLED,
            assignedEmployeeId: sampleEmployeeId,
            reason: "Duplicate task created in error",
          });
        });
      });

      it("should permit IN_PROGRESS -> COMPLETED with assigned employee", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.IN_PROGRESS,
            targetStatus: TaskStatus.COMPLETED,
            assignedEmployeeId: sampleEmployeeId,
          });
        });
      });

      it("should permit IN_PROGRESS -> CANCELLED with reason", () => {
        assert.doesNotThrow(() => {
          TaskStateMachine.validateTransition({
            currentStatus: TaskStatus.IN_PROGRESS,
            targetStatus: TaskStatus.CANCELLED,
            assignedEmployeeId: sampleEmployeeId,
            reason: "Patient admitted to Emergency Room",
          });
        });
      });
    });

    describe("Invalid & Disallowed Status Transitions", () => {
      it("should reject PENDING -> IN_PROGRESS directly (must be assigned first)", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.PENDING,
              targetStatus: TaskStatus.IN_PROGRESS,
              assignedEmployeeId: sampleEmployeeId,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            assert.match(err.message, /Invalid status transition from 'PENDING' to 'IN_PROGRESS'/);
            return true;
          }
        );
      });

      it("should reject PENDING -> COMPLETED directly", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.PENDING,
              targetStatus: TaskStatus.COMPLETED,
              assignedEmployeeId: sampleEmployeeId,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            return true;
          }
        );
      });

      it("should reject ASSIGNED -> COMPLETED directly without IN_PROGRESS", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.ASSIGNED,
              targetStatus: TaskStatus.COMPLETED,
              assignedEmployeeId: sampleEmployeeId,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            return true;
          }
        );
      });

      it("should reject IN_PROGRESS -> PENDING", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.IN_PROGRESS,
              targetStatus: TaskStatus.PENDING,
              assignedEmployeeId: sampleEmployeeId,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            return true;
          }
        );
      });

      it("should reject transition if target is same as current status", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.ASSIGNED,
              targetStatus: TaskStatus.ASSIGNED,
              assignedEmployeeId: sampleEmployeeId,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            assert.match(err.message, /already in status 'ASSIGNED'/);
            return true;
          }
        );
      });
    });

    describe("Employee Assignment Requirement for IN_PROGRESS and COMPLETED", () => {
      it("should reject transition to IN_PROGRESS when assignedEmployeeId is null", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.ASSIGNED,
              targetStatus: TaskStatus.IN_PROGRESS,
              assignedEmployeeId: null,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            assert.match(err.message, /without an assigned employee/);
            return true;
          }
        );
      });

      it("should reject transition to COMPLETED when assignedEmployeeId is null", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.IN_PROGRESS,
              targetStatus: TaskStatus.COMPLETED,
              assignedEmployeeId: undefined,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            assert.match(err.message, /without an assigned employee/);
            return true;
          }
        );
      });
    });

    describe("Terminal State Enforcement (COMPLETED and CANCELLED)", () => {
      it("should reject any transition from COMPLETED", () => {
        for (const target of [
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.IN_PROGRESS,
          TaskStatus.CANCELLED,
        ]) {
          assert.throws(
            () => {
              TaskStateMachine.validateTransition({
                currentStatus: TaskStatus.COMPLETED,
                targetStatus: target,
                assignedEmployeeId: sampleEmployeeId,
              });
            },
            (err: Error) => {
              assert.ok(err instanceof BadRequestError);
              assert.match(err.message, /terminal state 'COMPLETED'/);
              return true;
            }
          );
        }
      });

      it("should reject any transition from CANCELLED", () => {
        for (const target of [
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.IN_PROGRESS,
          TaskStatus.COMPLETED,
        ]) {
          assert.throws(
            () => {
              TaskStateMachine.validateTransition({
                currentStatus: TaskStatus.CANCELLED,
                targetStatus: target,
                assignedEmployeeId: sampleEmployeeId,
              });
            },
            (err: Error) => {
              assert.ok(err instanceof BadRequestError);
              assert.match(err.message, /terminal state 'CANCELLED'/);
              return true;
            }
          );
        }
      });
    });

    describe("Mandatory Cancellation Reason", () => {
      it("should reject transition to CANCELLED without reason", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.PENDING,
              targetStatus: TaskStatus.CANCELLED,
              assignedEmployeeId: null,
              reason: undefined,
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            assert.match(err.message, /mandatory cancellation reason/);
            return true;
          }
        );
      });

      it("should reject transition to CANCELLED with empty whitespace reason", () => {
        assert.throws(
          () => {
            TaskStateMachine.validateTransition({
              currentStatus: TaskStatus.ASSIGNED,
              targetStatus: TaskStatus.CANCELLED,
              assignedEmployeeId: sampleEmployeeId,
              reason: "   ",
            });
          },
          (err: Error) => {
            assert.ok(err instanceof BadRequestError);
            assert.match(err.message, /mandatory cancellation reason/);
            return true;
          }
        );
      });
    });
  });

  // =========================================================================
  // 2. TaskService Unit Tests
  // =========================================================================
  describe("TaskService Business Logic", () => {
    it("should throw NotFoundError when fetching non-existent task by ID", async () => {
      const mockRepo = {
        findById: async () => null,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      await assert.rejects(
        async () => {
          await service.getTaskById("99999999-9999-9999-9999-999999999999");
        },
        (err: Error) => {
          assert.ok(err instanceof NotFoundError);
          assert.match(err.message, /not found/);
          return true;
        }
      );
    });

    it("should calculate correct pagination metadata in listTasks", async () => {
      const mockTasks = [
        { id: "task-1", title: "Task 1" },
        { id: "task-2", title: "Task 2" },
      ];

      const mockRepo = {
        findMany: async () => ({ tasks: mockTasks, total: 35 }),
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      const result = await service.listTasks({
        page: 1,
        limit: 10,
      });

      assert.equal(result.data.length, 2);
      assert.equal(result.meta.total, 35);
      assert.equal(result.meta.page, 1);
      assert.equal(result.meta.limit, 10);
      assert.equal(result.meta.totalPages, 4);
      assert.equal(result.meta.hasNextPage, true);
      assert.equal(result.meta.hasPrevPage, false);
    });

    it("should validate and execute status update through repository", async () => {
      const mockTask = {
        id: "task-123",
        status: TaskStatus.ASSIGNED,
        assignedEmployeeId: sampleEmployeeId,
      };

      const mockRepo = {
        findById: async () => mockTask,
        updateStatus: async (
          id: string,
          targetStatus: TaskStatus
        ) => ({
          ...mockTask,
          status: targetStatus,
        }),
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      const updated = await service.updateTaskStatus("task-123", {
        status: TaskStatus.IN_PROGRESS,
      });

      assert.equal(updated.status, TaskStatus.IN_PROGRESS);
    });
  });

  // =========================================================================
  // 3. HTTP API Endpoints
  // =========================================================================
  describe("Express HTTP Endpoints: /api/v1/tasks", () => {
    it("GET /api/v1/tasks/:id with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app).get("/api/v1/tasks/invalid-uuid-string");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("PATCH /api/v1/tasks/:id/status with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app)
        .patch("/api/v1/tasks/invalid-uuid-string/status")
        .send({ status: "IN_PROGRESS" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("PATCH /api/v1/tasks/:id/status with invalid status enum should return 400 Bad Request", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const res = await request(app)
        .patch(`/api/v1/tasks/${validUuid}/status`)
        .send({ status: "NON_EXISTENT_STATUS" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("POST /api/v1/tasks with missing required fields should return 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/v1/tasks")
        .send({
          title: "Incomplete task payload",
          // missing callId, departmentId
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
