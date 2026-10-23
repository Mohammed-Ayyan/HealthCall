import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { TaskService } from "../src/modules/tasks/tasks.service";
import { TaskRepository, AssignOrTransferParams } from "../src/modules/tasks/tasks.repository";
import { TaskStatus, Priority } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../src/errors/appError";
import {
  assignTaskSchema,
  changePrioritySchema,
  createTaskNoteSchema,
} from "../src/modules/tasks/tasks.validation";

describe("Phase 5: Employee Assignment, Transfer & Notes System", () => {
  const sampleTaskId = "11111111-1111-1111-1111-111111111111";
  const sampleEmployeeId = "22222222-2222-2222-2222-222222222222";
  const otherEmployeeId = "33333333-3333-3333-3333-333333333333";
  const sampleAuthorId = "44444444-4444-4444-4444-444444444444";

  // =========================================================================
  // 1. Zod Validation Unit Tests
  // =========================================================================
  describe("Phase 5 Request Validation Schemas", () => {
    it("should accept valid assignTaskSchema payload with employeeId", async () => {
      const parsed = await assignTaskSchema.parseAsync({
        employeeId: sampleEmployeeId,
      });
      assert.equal(parsed.employeeId, sampleEmployeeId);
    });

    it("should accept valid assignTaskSchema payload with departmentId and autoAssign", async () => {
      const parsed = await assignTaskSchema.parseAsync({
        departmentId: "insurance",
        autoAssign: true,
      });
      assert.equal(parsed.departmentId, "insurance");
      assert.equal(parsed.autoAssign, true);
    });

    it("should reject assignTaskSchema when all fields are missing", async () => {
      await assert.rejects(async () => {
        await assignTaskSchema.parseAsync({});
      });
    });

    it("should accept valid changePrioritySchema with valid priority", async () => {
      const parsed = await changePrioritySchema.parseAsync({
        priority: "URGENT",
      });
      assert.equal(parsed.priority, Priority.URGENT);
    });

    it("should reject changePrioritySchema with invalid priority", async () => {
      await assert.rejects(async () => {
        await changePrioritySchema.parseAsync({
          priority: "CRITICAL", // CRITICAL is not a priority enum
        });
      });
    });

    it("should accept valid createTaskNoteSchema", async () => {
      const parsed = await createTaskNoteSchema.parseAsync({
        authorId: sampleAuthorId,
        note: "Followed up with cardiology team",
      });
      assert.equal(parsed.authorId, sampleAuthorId);
      assert.equal(parsed.note, "Followed up with cardiology team");
    });

    it("should reject createTaskNoteSchema with empty note", async () => {
      await assert.rejects(async () => {
        await createTaskNoteSchema.parseAsync({
          authorId: sampleAuthorId,
          note: "",
        });
      });
    });

    it("should reject createTaskNoteSchema with missing authorId", async () => {
      await assert.rejects(async () => {
        await createTaskNoteSchema.parseAsync({
          note: "Note text",
        });
      });
    });
  });

  // =========================================================================
  // 2. Service Layer: Assignment & Transfer Logic
  // =========================================================================
  describe("TaskService Assignment & Transfer Business Logic", () => {
    it("should throw BadRequestError when assigning a completed (terminal) task", async () => {
      const mockTask = {
        id: sampleTaskId,
        status: TaskStatus.COMPLETED,
        departmentId: "reception",
        assignedEmployeeId: sampleEmployeeId,
      };

      const mockRepo = {
        findById: async () => mockTask,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      await assert.rejects(
        async () => {
          await service.assignTask(sampleTaskId, {
            employeeId: otherEmployeeId,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof BadRequestError);
          assert.match(err.message, /terminal state/);
          return true;
        }
      );
    });

    it("should throw BadRequestError when changing priority of a cancelled (terminal) task", async () => {
      const mockTask = {
        id: sampleTaskId,
        status: TaskStatus.CANCELLED,
        departmentId: "reception",
        priority: Priority.MEDIUM,
      };

      const mockRepo = {
        findById: async () => mockTask,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      await assert.rejects(
        async () => {
          await service.changePriority(sampleTaskId, {
            priority: Priority.HIGH,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof BadRequestError);
          assert.match(err.message, /terminal state/);
          return true;
        }
      );
    });

    it("should return unchanged task if new priority equals current priority", async () => {
      const mockTask = {
        id: sampleTaskId,
        status: TaskStatus.IN_PROGRESS,
        departmentId: "reception",
        priority: Priority.URGENT,
      };

      const mockRepo = {
        findById: async () => mockTask,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      const res = await service.changePriority(sampleTaskId, {
        priority: Priority.URGENT,
      });

      assert.equal(res.priority, Priority.URGENT);
    });

    it("should throw NotFoundError when adding note to non-existent task", async () => {
      const mockRepo = {
        findById: async () => null,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      await assert.rejects(
        async () => {
          await service.addNote(sampleTaskId, {
            authorId: sampleAuthorId,
            note: "Sample note",
          });
        },
        (err: Error) => {
          assert.ok(err instanceof NotFoundError);
          assert.match(err.message, /not found/);
          return true;
        }
      );
    });

    it("should throw NotFoundError when listing notes of non-existent task", async () => {
      const mockRepo = {
        findById: async () => null,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      await assert.rejects(
        async () => {
          await service.listNotes(sampleTaskId);
        },
        (err: Error) => {
          assert.ok(err instanceof NotFoundError);
          return true;
        }
      );
    });

    it("should retrieve notes in chronological order", async () => {
      const mockNotes = [
        { id: "note-1", note: "First note", createdAt: new Date("2026-10-13T10:00:00Z") },
        { id: "note-2", note: "Second note", createdAt: new Date("2026-10-13T10:30:00Z") },
      ];

      const mockRepo = {
        findById: async () => ({ id: sampleTaskId }),
        listNotes: async () => mockNotes,
      } as unknown as TaskRepository;

      const service = new TaskService(mockRepo);
      const notes = await service.listNotes(sampleTaskId);

      assert.equal(notes.length, 2);
      assert.equal(notes[0].note, "First note");
      assert.equal(notes[1].note, "Second note");
    });
  });

  // =========================================================================
  // 3. HTTP Endpoints: /api/v1/tasks/:id/assign, /priority, /notes
  // =========================================================================
  describe("Express HTTP Endpoints for Phase 5", () => {
    it("PATCH /api/v1/tasks/:id/assign with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app)
        .patch("/api/v1/tasks/not-a-valid-uuid/assign")
        .send({ autoAssign: true });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("PATCH /api/v1/tasks/:id/assign with empty payload should return 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${sampleTaskId}/assign`)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("PATCH /api/v1/tasks/:id/priority with invalid priority should return 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${sampleTaskId}/priority`)
        .send({ priority: "EXTREME" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("POST /api/v1/tasks/:id/notes with empty note should return 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${sampleTaskId}/notes`)
        .send({ authorId: sampleAuthorId, note: "" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("POST /api/v1/tasks/:id/notes with non-UUID authorId should return 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${sampleTaskId}/notes`)
        .send({ authorId: "not-a-uuid", note: "Sample note" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("GET /api/v1/tasks/:id/notes with invalid UUID should return 400 Bad Request", async () => {
      const res = await request(app).get("/api/v1/tasks/not-a-uuid/notes");

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
