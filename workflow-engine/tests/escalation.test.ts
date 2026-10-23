import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { EscalationService, escalationService } from "../src/modules/escalation/escalation.service";
import { EscalationScheduler, escalationScheduler } from "../src/modules/escalation/escalation.scheduler";
import {
  Priority,
  TaskStatus,
  EscalationLevel,
  EmployeeRole,
} from "@prisma/client";
import { BadRequestError, NotFoundError } from "../src/errors/appError";
import {
  escalateTaskSchema,
  listEscalatedTasksQuerySchema,
} from "../src/modules/tasks/tasks.validation";

describe("Phase 7: Escalation Engine & Background Breach Monitor", () => {
  const sampleTaskId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const sampleDeptId = "dept-emergency";
  const staffEmployeeId = "11111111-1111-1111-1111-111111111111";
  const managerEmployeeId = "22222222-2222-2222-2222-222222222222";
  const adminEmployeeId = "33333333-3333-3333-3333-333333333333";

  // =========================================================================
  // 1. Zod Validation Schemas
  // =========================================================================
  describe("Phase 7 Validation Schemas", () => {
    it("should accept valid escalateTaskSchema payload", async () => {
      const parsed = await escalateTaskSchema.parseAsync({
        reason: "Patient condition deteriorated, physician review required",
        employeeId: staffEmployeeId,
      });
      assert.equal(parsed.employeeId, staffEmployeeId);
      assert.equal(
        parsed.reason,
        "Patient condition deteriorated, physician review required"
      );
    });

    it("should reject escalateTaskSchema when reason is empty", async () => {
      await assert.rejects(async () => {
        await escalateTaskSchema.parseAsync({
          reason: "   ",
          employeeId: staffEmployeeId,
        });
      });
    });

    it("should reject escalateTaskSchema when employeeId is not a valid UUID", async () => {
      await assert.rejects(async () => {
        await escalateTaskSchema.parseAsync({
          reason: "Valid reason",
          employeeId: "not-a-uuid",
        });
      });
    });

    it("should accept valid listEscalatedTasksQuerySchema with level 1 or 2", async () => {
      const q1 = await listEscalatedTasksQuerySchema.parseAsync({
        escalationLevel: "1",
      });
      assert.equal(q1.escalationLevel, "1");

      const q2 = await listEscalatedTasksQuerySchema.parseAsync({
        escalationLevel: "2",
      });
      assert.equal(q2.escalationLevel, "2");
    });

    it("should reject invalid escalationLevel parameter in query schema", async () => {
      await assert.rejects(async () => {
        await listEscalatedTasksQuerySchema.parseAsync({
          escalationLevel: "5",
        });
      });
    });
  });

  // =========================================================================
  // 2. Escalation Level Parser
  // =========================================================================
  describe("Escalation Level Parser (parseEscalationLevel)", () => {
    const service = new EscalationService({} as any);

    it("should correctly parse Level 0 representations", () => {
      assert.equal(service.parseEscalationLevel(0), EscalationLevel.NONE);
      assert.equal(service.parseEscalationLevel("0"), EscalationLevel.NONE);
      assert.equal(service.parseEscalationLevel("NONE"), EscalationLevel.NONE);
      assert.equal(service.parseEscalationLevel("NORMAL"), EscalationLevel.NONE);
    });

    it("should correctly parse Level 1 representations", () => {
      assert.equal(service.parseEscalationLevel(1), EscalationLevel.MANAGER);
      assert.equal(service.parseEscalationLevel("1"), EscalationLevel.MANAGER);
      assert.equal(service.parseEscalationLevel("MANAGER"), EscalationLevel.MANAGER);
      assert.equal(service.parseEscalationLevel("LEVEL_1"), EscalationLevel.MANAGER);
    });

    it("should correctly parse Level 2 representations", () => {
      assert.equal(service.parseEscalationLevel(2), EscalationLevel.ADMINISTRATOR);
      assert.equal(service.parseEscalationLevel("2"), EscalationLevel.ADMINISTRATOR);
      assert.equal(service.parseEscalationLevel("ADMIN"), EscalationLevel.ADMINISTRATOR);
      assert.equal(service.parseEscalationLevel("ADMINISTRATOR"), EscalationLevel.ADMINISTRATOR);
      assert.equal(service.parseEscalationLevel("LEVEL_2"), EscalationLevel.ADMINISTRATOR);
    });

    it("should return null for invalid or missing values", () => {
      assert.equal(service.parseEscalationLevel(undefined), null);
      assert.equal(service.parseEscalationLevel(null), null);
      assert.equal(service.parseEscalationLevel(""), null);
      assert.equal(service.parseEscalationLevel("INVALID"), null);
    });
  });

  // =========================================================================
  // 3. Automated Level 1 Escalation (Manager Alert)
  // =========================================================================
  describe("Level 1 Escalation: Warning / Manager Alert", () => {
    it("should escalate Level 0 task to Level 1 when NEAR_BREACH (<=30m remaining)", async () => {
      const now = new Date("2026-10-13T10:00:00.000Z");
      // Deadline 20m from now -> remainingMinutes = 20 <= 30 (NEAR_BREACH)
      const deadline = new Date("2026-10-13T10:20:00.000Z");

      const mockTask: any = {
        id: sampleTaskId,
        departmentId: sampleDeptId,
        assignedEmployeeId: staffEmployeeId,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        escalationLevel: EscalationLevel.NONE,
        deadlineAt: deadline,
        createdAt: new Date("2026-10-13T09:00:00.000Z"),
        department: {
          id: sampleDeptId,
          name: "Emergency Triage",
          manager: {
            id: managerEmployeeId,
            fullName: "Dr. Aris Thorne",
            role: EmployeeRole.MANAGER,
          },
        },
        assignedEmployee: {
          id: staffEmployeeId,
          fullName: "Nurse Clara Oswald",
        },
      };

      let updatedTaskData: any = null;
      let createdTimelineData: any = null;
      let createdNoteData: any = null;

      const mockDb: any = {
        task: {
          findMany: async () => [mockTask],
        },
        $transaction: async (fn: any) => {
          return await fn({
            task: {
              update: async ({ data }: any) => {
                updatedTaskData = data;
                return { ...mockTask, ...data };
              },
            },
            taskTimeline: {
              create: async ({ data }: any) => {
                createdTimelineData = data;
                return { id: "timeline-1", ...data };
              },
            },
            taskNote: {
              create: async ({ data }: any) => {
                createdNoteData = data;
                return { id: "note-1", ...data };
              },
            },
          });
        },
      };

      const service = new EscalationService(mockDb);
      const result = await service.checkAndEscalateTasks(now);

      assert.equal(result.scannedCount, 1);
      assert.equal(result.escalatedToLevel1Count, 1);
      assert.equal(result.escalatedToLevel2Count, 0);
      assert.deepEqual(result.escalatedTaskIds, [sampleTaskId]);

      // Check Task update
      assert.equal(updatedTaskData.escalationLevel, EscalationLevel.MANAGER);

      // Check TaskTimeline audit
      assert.equal(createdTimelineData.eventType, "ESCALATED_TO_LEVEL_1");
      assert.equal(createdTimelineData.actorId, managerEmployeeId);
      assert.match(createdTimelineData.message, /Escalated to Level 1/);
      assert.equal(createdTimelineData.metadata.newLevel, "MANAGER");

      // Check TaskNote audit
      assert.match(createdNoteData.note, /AUTOMATED SYSTEM ALERT - LEVEL 1/);
      assert.match(createdNoteData.note, /Dr. Aris Thorne/);
    });

    it("should escalate Level 0 task to Level 1 when already BREACHED (<15m past deadline)", async () => {
      const now = new Date("2026-10-13T10:05:00.000Z");
      // Deadline 5 minutes ago -> remainingMinutes = -5 (BREACHED, but not >15m)
      const deadline = new Date("2026-10-13T10:00:00.000Z");

      const mockTask: any = {
        id: sampleTaskId,
        departmentId: sampleDeptId,
        assignedEmployeeId: staffEmployeeId,
        status: TaskStatus.ASSIGNED,
        priority: Priority.MEDIUM,
        escalationLevel: EscalationLevel.NONE,
        deadlineAt: deadline,
        createdAt: new Date("2026-10-13T08:00:00.000Z"),
        department: {
          id: sampleDeptId,
          manager: {
            id: managerEmployeeId,
            fullName: "Dr. Aris Thorne",
          },
        },
      };

      let updatedTaskData: any = null;
      const mockDb: any = {
        task: {
          findMany: async () => [mockTask],
        },
        $transaction: async (fn: any) =>
          fn({
            task: {
              update: async ({ data }: any) => {
                updatedTaskData = data;
                return { ...mockTask, ...data };
              },
            },
            taskTimeline: { create: async () => ({}) },
            taskNote: { create: async () => ({}) },
          }),
      };

      const service = new EscalationService(mockDb);
      const result = await service.checkAndEscalateTasks(now);

      assert.equal(result.escalatedToLevel1Count, 1);
      assert.equal(updatedTaskData.escalationLevel, EscalationLevel.MANAGER);
    });

    it("should NOT escalate Level 0 task when ON_TRACK (>30m remaining)", async () => {
      const now = new Date("2026-10-13T10:00:00.000Z");
      // Deadline in 90 minutes -> remainingMinutes = 90 (ON_TRACK)
      const deadline = new Date("2026-10-13T11:30:00.000Z");

      const mockTask: any = {
        id: sampleTaskId,
        status: TaskStatus.IN_PROGRESS,
        escalationLevel: EscalationLevel.NONE,
        deadlineAt: deadline,
        createdAt: new Date("2026-10-13T09:00:00.000Z"),
      };

      let updateCalled = false;
      const mockDb: any = {
        task: {
          findMany: async () => [mockTask],
        },
        $transaction: async () => {
          updateCalled = true;
        },
      };

      const service = new EscalationService(mockDb);
      const result = await service.checkAndEscalateTasks(now);

      assert.equal(result.scannedCount, 1);
      assert.equal(result.escalatedToLevel1Count, 0);
      assert.equal(result.escalatedToLevel2Count, 0);
      assert.equal(updateCalled, false);
    });
  });

  // =========================================================================
  // 4. Automated Level 2 Escalation (Critical / Reassignment / Admin Alert)
  // =========================================================================
  describe("Level 2 Escalation: Critical / Reassignment or Admin Alert", () => {
    it("should escalate Level 1 task to Level 2 when breached for >15 minutes past deadline", async () => {
      const now = new Date("2026-10-13T10:30:00.000Z");
      // Deadline was 30 minutes ago -> remainingMinutes = -30 (< -15)
      const deadline = new Date("2026-10-13T10:00:00.000Z");

      const mockTask: any = {
        id: sampleTaskId,
        departmentId: sampleDeptId,
        assignedEmployeeId: staffEmployeeId,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH, // Not yet URGENT
        escalationLevel: EscalationLevel.MANAGER, // Already at Level 1
        deadlineAt: deadline,
        createdAt: new Date("2026-10-13T08:00:00.000Z"),
        department: { id: sampleDeptId },
      };

      const mockManager: any = {
        id: managerEmployeeId,
        fullName: "Dr. Aris Thorne",
        role: EmployeeRole.MANAGER,
        departmentId: sampleDeptId,
        activeTasksCount: 2,
      };

      let updatedTaskData: any = null;
      let createdTimelineData: any = null;
      let decrementedEmployeeId: string | null = null;
      let incrementedEmployeeId: string | null = null;

      const mockDb: any = {
        task: {
          findMany: async () => [mockTask],
        },
        employee: {
          // Finds least-loaded department manager
          findFirst: async () => mockManager,
        },
        $transaction: async (fn: any) =>
          fn({
            employee: {
              update: async ({ where, data }: any) => {
                if (data.activeTasksCount?.decrement) {
                  decrementedEmployeeId = where.id;
                }
                if (data.activeTasksCount?.increment) {
                  incrementedEmployeeId = where.id;
                }
                return {};
              },
            },
            task: {
              update: async ({ data }: any) => {
                updatedTaskData = data;
                return { ...mockTask, ...data };
              },
            },
            taskTimeline: {
              create: async ({ data }: any) => {
                createdTimelineData = data;
                return { id: "timeline-2", ...data };
              },
            },
            taskNote: {
              create: async () => ({ id: "note-2" }),
            },
          }),
      };

      const service = new EscalationService(mockDb);
      const result = await service.checkAndEscalateTasks(now);

      assert.equal(result.escalatedToLevel2Count, 1);
      assert.deepEqual(result.escalatedTaskIds, [sampleTaskId]);

      // Task updates
      assert.equal(updatedTaskData.escalationLevel, EscalationLevel.ADMINISTRATOR);
      assert.equal(updatedTaskData.priority, Priority.URGENT);
      assert.equal(updatedTaskData.assignedEmployeeId, managerEmployeeId);

      // Reassignment count updates
      assert.equal(decrementedEmployeeId, staffEmployeeId);
      assert.equal(incrementedEmployeeId, managerEmployeeId);

      // Timeline audit
      assert.equal(createdTimelineData.eventType, "ESCALATED_TO_LEVEL_2");
      assert.equal(createdTimelineData.metadata.newLevel, "ADMINISTRATOR");
      assert.equal(createdTimelineData.metadata.newPriority, "URGENT");
      assert.match(createdTimelineData.message, /Escalated to Level 2/);
    });

    it("should fall back to Hospital Administrator when no department manager is available", async () => {
      const now = new Date("2026-10-13T10:30:00.000Z");
      const deadline = new Date("2026-10-13T10:00:00.000Z");

      const mockTask: any = {
        id: sampleTaskId,
        departmentId: sampleDeptId,
        assignedEmployeeId: staffEmployeeId,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        escalationLevel: EscalationLevel.MANAGER,
        deadlineAt: deadline,
        createdAt: new Date("2026-10-13T08:00:00.000Z"),
      };

      const mockAdmin: any = {
        id: adminEmployeeId,
        fullName: "Chief Medical Officer",
        role: EmployeeRole.ADMINISTRATOR,
        activeTasksCount: 0,
      };

      let updatedTaskData: any = null;
      const mockDb: any = {
        task: {
          findMany: async () => [mockTask],
        },
        employee: {
          findFirst: async ({ where }: any) => {
            // No department manager found
            if (where.role === EmployeeRole.MANAGER) return null;
            // Admin found
            if (where.role === EmployeeRole.ADMINISTRATOR) return mockAdmin;
            return null;
          },
        },
        $transaction: async (fn: any) =>
          fn({
            employee: { update: async () => ({}) },
            task: {
              update: async ({ data }: any) => {
                updatedTaskData = data;
                return { ...mockTask, ...data };
              },
            },
            taskTimeline: { create: async () => ({}) },
            taskNote: { create: async () => ({}) },
          }),
      };

      const service = new EscalationService(mockDb);
      const result = await service.checkAndEscalateTasks(now);

      assert.equal(result.escalatedToLevel2Count, 1);
      assert.equal(updatedTaskData.assignedEmployeeId, adminEmployeeId);
      assert.equal(updatedTaskData.escalationLevel, EscalationLevel.ADMINISTRATOR);
    });

    it("should NOT escalate Level 1 task to Level 2 if breached for <=15 minutes", async () => {
      const now = new Date("2026-10-13T10:10:00.000Z");
      // Deadline was 10 minutes ago -> remainingMinutes = -10 (not < -15)
      const deadline = new Date("2026-10-13T10:00:00.000Z");

      const mockTask: any = {
        id: sampleTaskId,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        escalationLevel: EscalationLevel.MANAGER,
        deadlineAt: deadline,
        createdAt: new Date("2026-10-13T08:00:00.000Z"),
      };

      let updateCalled = false;
      const mockDb: any = {
        task: {
          findMany: async () => [mockTask],
        },
        $transaction: async () => {
          updateCalled = true;
        },
      };

      const service = new EscalationService(mockDb);
      const result = await service.checkAndEscalateTasks(now);

      assert.equal(result.escalatedToLevel1Count, 0);
      assert.equal(result.escalatedToLevel2Count, 0);
      assert.equal(updateCalled, false);
    });
  });

  // =========================================================================
  // 5. Manual Escalation Service
  // =========================================================================
  describe("Manual Escalation (manualEscalate)", () => {
    it("should manually escalate Level 0 task to Level 1", async () => {
      const mockTask: any = {
        id: sampleTaskId,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        escalationLevel: EscalationLevel.NONE,
        deadlineAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      const mockEmployee: any = {
        id: staffEmployeeId,
        fullName: "Nurse Clara",
        role: EmployeeRole.STAFF,
      };

      let updatedTaskData: any = null;
      let createdTimelineData: any = null;

      const mockDb: any = {
        task: {
          findUnique: async () => mockTask,
        },
        employee: {
          findUnique: async () => mockEmployee,
        },
        $transaction: async (fn: any) =>
          fn({
            task: {
              update: async ({ data }: any) => {
                updatedTaskData = data;
                return { ...mockTask, ...data };
              },
            },
            taskTimeline: {
              create: async ({ data }: any) => {
                createdTimelineData = data;
                return data;
              },
            },
            taskNote: {
              create: async ({ data }: any) => data,
            },
          }),
      };

      const service = new EscalationService(mockDb);
      const result = await service.manualEscalate(
        sampleTaskId,
        "Doctor requested manager oversight",
        staffEmployeeId
      );

      assert.equal(updatedTaskData.escalationLevel, EscalationLevel.MANAGER);
      assert.equal(createdTimelineData.eventType, "ESCALATED_TO_LEVEL_1");
      assert.match(createdTimelineData.message, /Doctor requested manager oversight/);
      assert.ok(result.sla);
    });

    it("should manually escalate Level 1 task to Level 2 and bump priority to URGENT", async () => {
      const mockTask: any = {
        id: sampleTaskId,
        status: TaskStatus.ASSIGNED,
        priority: Priority.HIGH,
        escalationLevel: EscalationLevel.MANAGER,
        deadlineAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      const mockEmployee: any = {
        id: managerEmployeeId,
        fullName: "Dr. Thorne",
        role: EmployeeRole.MANAGER,
      };

      let updatedTaskData: any = null;
      const mockDb: any = {
        task: {
          findUnique: async () => mockTask,
        },
        employee: {
          findUnique: async () => mockEmployee,
        },
        $transaction: async (fn: any) =>
          fn({
            task: {
              update: async ({ data }: any) => {
                updatedTaskData = data;
                return { ...mockTask, ...data };
              },
            },
            taskTimeline: { create: async () => ({}) },
            taskNote: { create: async () => ({}) },
          }),
      };

      const service = new EscalationService(mockDb);
      const result = await service.manualEscalate(
        sampleTaskId,
        "Critical condition escalation",
        managerEmployeeId
      );

      assert.equal(updatedTaskData.escalationLevel, EscalationLevel.ADMINISTRATOR);
      assert.equal(updatedTaskData.priority, Priority.URGENT);
      assert.ok(result.sla);
    });

    it("should reject manual escalation when task is already at Level 2", async () => {
      const mockTask: any = {
        id: sampleTaskId,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        escalationLevel: EscalationLevel.ADMINISTRATOR,
      };

      const mockDb: any = {
        task: {
          findUnique: async () => mockTask,
        },
        employee: {
          findUnique: async () => ({ id: managerEmployeeId, fullName: "Dr. Thorne", role: "MANAGER" }),
        },
      };

      const service = new EscalationService(mockDb);
      await assert.rejects(
        async () => {
          await service.manualEscalate(
            sampleTaskId,
            "Try to escalate higher",
            managerEmployeeId
          );
        },
        (err: Error) => {
          assert.ok(err instanceof BadRequestError);
          assert.match(err.message, /maximum escalation level/);
          return true;
        }
      );
    });

    it("should reject manual escalation for terminal (COMPLETED or CANCELLED) tasks", async () => {
      const mockTask: any = {
        id: sampleTaskId,
        status: TaskStatus.COMPLETED,
        escalationLevel: EscalationLevel.NONE,
      };

      const mockDb: any = {
        task: {
          findUnique: async () => mockTask,
        },
      };

      const service = new EscalationService(mockDb);
      await assert.rejects(
        async () => {
          await service.manualEscalate(
            sampleTaskId,
            "Reason",
            staffEmployeeId
          );
        },
        (err: Error) => {
          assert.ok(err instanceof BadRequestError);
          assert.match(err.message, /terminal state/);
          return true;
        }
      );
    });

    it("should throw NotFoundError if task is not found", async () => {
      const mockDb: any = {
        task: {
          findUnique: async () => null,
        },
      };

      const service = new EscalationService(mockDb);
      await assert.rejects(
        async () => {
          await service.manualEscalate(
            sampleTaskId,
            "Reason",
            staffEmployeeId
          );
        },
        (err: Error) => {
          assert.ok(err instanceof NotFoundError);
          return true;
        }
      );
    });

    it("should throw BadRequestError if reason is empty", async () => {
      const service = new EscalationService({} as any);
      await assert.rejects(
        async () => {
          await service.manualEscalate(sampleTaskId, "   ", staffEmployeeId);
        },
        (err: Error) => {
          assert.ok(err instanceof BadRequestError);
          assert.match(err.message, /cannot be empty/);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 6. Escalated Tasks Query Service (getEscalatedTasks)
  // =========================================================================
  describe("Escalated Tasks Query Service (getEscalatedTasks)", () => {
    it("should return escalated tasks grouped by Level 1 and Level 2 with metadata", async () => {
      const mockTasks: any[] = [
        {
          id: "task-1",
          escalationLevel: EscalationLevel.MANAGER,
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          createdAt: new Date(),
          deadlineAt: new Date(Date.now() + 600000),
        },
        {
          id: "task-2",
          escalationLevel: EscalationLevel.ADMINISTRATOR,
          status: TaskStatus.ASSIGNED,
          priority: Priority.URGENT,
          createdAt: new Date(),
          deadlineAt: new Date(Date.now() - 1800000),
        },
      ];

      const mockDb: any = {
        task: {
          findMany: async () => mockTasks,
        },
      };

      const service = new EscalationService(mockDb);
      const res = await service.getEscalatedTasks();

      assert.equal(res.data.length, 2);
      assert.equal(res.meta.total, 2);
      assert.equal(res.meta.level1Count, 1);
      assert.equal(res.meta.level2Count, 1);
      assert.equal(res.grouped.level1.length, 1);
      assert.equal(res.grouped.level2.length, 1);
      assert.ok(res.data[0].sla);
    });
  });

  // =========================================================================
  // 7. Background Monitoring Job (EscalationScheduler)
  // =========================================================================
  describe("Background Monitoring Job (EscalationScheduler)", () => {
    it("should start and stop timer cleanly", () => {
      const scheduler = new EscalationScheduler();
      assert.equal(scheduler.isActive(), false);

      scheduler.start(10000);
      assert.equal(scheduler.isActive(), true);

      scheduler.stop();
      assert.equal(scheduler.isActive(), false);
    });

    it("should not start duplicate timers when already running", () => {
      const scheduler = new EscalationScheduler();
      scheduler.start(10000);
      const originalTimer = (scheduler as any).timer;

      // Call start again
      scheduler.start(10000);
      assert.equal((scheduler as any).timer, originalTimer);

      scheduler.stop();
    });

    it("should skip tick if previous checkAndEscalate is still running (overlap guard)", async () => {
      let callCount = 0;
      const customService = {
        checkAndEscalateTasks: async () => {
          callCount++;
        },
      } as any;

      const scheduler = new EscalationScheduler(customService);
      (scheduler as any).isRunning = true; // Simulate in-flight run

      await (scheduler as any).tick();
      assert.equal(callCount, 0); // Did not run because isRunning was true
    });
  });

  // =========================================================================
  // 8. Controller & HTTP Endpoints
  // =========================================================================
  describe("Controller & HTTP Endpoints", () => {
    let originalManualEscalate: any;
    let originalGetEscalatedTasks: any;

    beforeEach(() => {
      originalManualEscalate = escalationService.manualEscalate;
      originalGetEscalatedTasks = escalationService.getEscalatedTasks;
    });

    afterEach(() => {
      escalationService.manualEscalate = originalManualEscalate;
      escalationService.getEscalatedTasks = originalGetEscalatedTasks;
    });

    it("POST /api/v1/tasks/:id/escalate should succeed with valid payload", async () => {
      escalationService.manualEscalate = async (taskId, reason, employeeId) => {
        return {
          id: taskId,
          escalationLevel: EscalationLevel.MANAGER,
          priority: Priority.HIGH,
          status: TaskStatus.IN_PROGRESS,
          sla: { healthStatus: "NEAR_BREACH" },
        } as any;
      };

      const res = await request(app)
        .post(`/api/v1/tasks/${sampleTaskId}/escalate`)
        .send({
          reason: "Patient vital signs deteriorating",
          employeeId: staffEmployeeId,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.escalationLevel, "MANAGER");
      assert.equal(res.body.data.id, sampleTaskId);
    });

    it("POST /api/v1/tasks/:id/escalate should return 400 when reason is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${sampleTaskId}/escalate`)
        .send({
          employeeId: staffEmployeeId,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("POST /api/v1/tasks/:id/escalate should return 400 when id is invalid UUID", async () => {
      const res = await request(app)
        .post("/api/v1/tasks/not-a-uuid/escalate")
        .send({
          reason: "Some valid reason",
          employeeId: staffEmployeeId,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("GET /api/v1/tasks/escalated should return escalated task list and grouped object", async () => {
      escalationService.getEscalatedTasks = async (filterLevel) => {
        return {
          data: [
            {
              id: sampleTaskId,
              escalationLevel: EscalationLevel.MANAGER,
              sla: { healthStatus: "NEAR_BREACH" },
            } as any,
          ],
          grouped: {
            level1: [
              {
                id: sampleTaskId,
                escalationLevel: EscalationLevel.MANAGER,
                sla: { healthStatus: "NEAR_BREACH" },
              } as any,
            ],
            level2: [],
          },
          meta: {
            total: 1,
            level1Count: 1,
            level2Count: 0,
          },
        };
      };

      const res = await request(app).get("/api/v1/tasks/escalated");

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(Array.isArray(res.body.data), true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.meta.level1Count, 1);
      assert.ok(res.body.grouped.level1);
    });

    it("GET /api/v1/tasks/escalated should accept ?escalationLevel=1 query filter", async () => {
      let passedFilter: any = null;
      escalationService.getEscalatedTasks = async (filterLevel) => {
        passedFilter = filterLevel;
        return {
          data: [],
          grouped: { level1: [], level2: [] },
          meta: { total: 0, level1Count: 0, level2Count: 0 },
        };
      };

      const res = await request(app).get("/api/v1/tasks/escalated?escalationLevel=1");

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(passedFilter, "1");
    });

    it("GET /api/v1/tasks/escalated should reject invalid ?escalationLevel=99 with 400", async () => {
      const res = await request(app).get("/api/v1/tasks/escalated?escalationLevel=99");

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
