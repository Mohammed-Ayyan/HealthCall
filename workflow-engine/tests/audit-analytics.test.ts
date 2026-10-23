import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app";
import { AuditService, auditService } from "../src/modules/audit/audit.service";
import { AuditEventType } from "../src/modules/audit/audit.types";
import { AnalyticsService, analyticsService } from "../src/modules/analytics/analytics.service";
import { Priority, TaskStatus, EscalationLevel, EmployeeRole } from "@prisma/client";

describe("Phase 8: Comprehensive Audit Logging, Timeline Tracking & Operational Analytics", () => {
  const sampleTaskId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const sampleActorId = "11111111-1111-1111-1111-111111111111";
  const otherActorId = "22222222-2222-2222-2222-222222222222";

  // =========================================================================
  // 1. Audit Service Event Recording & Formatting
  // =========================================================================
  describe("AuditService: Unified Event Logging & Formatting", () => {
    it("should format and record CALL_LOGGED event with patient metadata", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-1", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(
        sampleTaskId,
        AuditEventType.CALL_LOGGED,
        sampleActorId,
        {
          patientName: "Jane Doe",
          patientMrn: "MRN-1002",
          callId: "call-99",
        }
      );

      assert.equal(createdData.taskId, sampleTaskId);
      assert.equal(createdData.eventType, "CALL_LOGGED");
      assert.equal(createdData.actorId, sampleActorId);
      assert.match(createdData.message, /Jane Doe/);
      assert.match(createdData.message, /MRN-1002/);
      assert.equal(createdData.metadata.callId, "call-99");
    });

    it("should format and record TASK_CREATED event with department and priority", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-2", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(
        sampleTaskId,
        AuditEventType.TASK_CREATED,
        null as any,
        {
          departmentId: "cardiology",
          priority: "HIGH",
        }
      );

      assert.equal(createdData.eventType, "TASK_CREATED");
      assert.match(createdData.message, /cardiology/);
      assert.match(createdData.message, /HIGH/);
    });

    it("should format and record TASK_ROUTED event", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-3", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.TASK_ROUTED, null as any, {
        departmentId: "emergency_triage",
      });

      assert.equal(createdData.eventType, "TASK_ROUTED");
      assert.match(createdData.message, /emergency_triage/);
    });

    it("should format and record TASK_ASSIGNED event with employee information", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-4", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.TASK_ASSIGNED, sampleActorId, {
        employeeId: sampleActorId,
        employeeName: "Nurse Clara Oswald",
      });

      assert.equal(createdData.eventType, "TASK_ASSIGNED");
      assert.match(createdData.message, /Nurse Clara Oswald/);
    });

    it("should format and record TASK_TRANSFERRED event with departmental and employee changes", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-5", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.TASK_TRANSFERRED, sampleActorId, {
        fromDepartmentId: "reception",
        toDepartmentId: "cardiology",
        fromEmployeeId: sampleActorId,
        toEmployeeId: otherActorId,
      });

      assert.equal(createdData.eventType, "TASK_TRANSFERRED");
      assert.match(createdData.message, /reception/);
      assert.match(createdData.message, /cardiology/);
    });

    it("should format and record STATUS_CHANGED event with previous and target status", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-6", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.STATUS_CHANGED, sampleActorId, {
        oldStatus: "ASSIGNED",
        newStatus: "IN_PROGRESS",
      });

      assert.equal(createdData.eventType, "STATUS_CHANGED");
      assert.match(createdData.message, /ASSIGNED/);
      assert.match(createdData.message, /IN_PROGRESS/);
    });

    it("should format and record PRIORITY_UPDATED event", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-7", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.PRIORITY_UPDATED, sampleActorId, {
        oldPriority: "MEDIUM",
        newPriority: "URGENT",
      });

      assert.equal(createdData.eventType, "PRIORITY_UPDATED");
      assert.match(createdData.message, /MEDIUM/);
      assert.match(createdData.message, /URGENT/);
    });

    it("should format and record NOTE_ADDED event with author metadata", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-8", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.NOTE_ADDED, sampleActorId, {
        authorName: "Dr. Gregory House",
        noteId: "note-123",
      });

      assert.equal(createdData.eventType, "NOTE_ADDED");
      assert.match(createdData.message, /Dr. Gregory House/);
    });

    it("should format and record SLA_BREACHED event", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-9", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.SLA_BREACHED, null as any, {
        breachedByMinutes: -25,
      });

      assert.equal(createdData.eventType, "SLA_BREACHED");
      assert.match(createdData.message, /25 minutes/);
    });

    it("should format and record ESCALATED_LEVEL_1 and ESCALATED_LEVEL_2 events", async () => {
      let l1Data: any = null;
      let l2Data: any = null;

      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            if (data.eventType === AuditEventType.ESCALATED_LEVEL_1) l1Data = data;
            if (data.eventType === AuditEventType.ESCALATED_LEVEL_2) l2Data = data;
            return { id: "timeline-esc", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.ESCALATED_LEVEL_1, null as any, {
        managerName: "Dr. Aris Thorne",
      });
      await service.recordEvent(sampleTaskId, AuditEventType.ESCALATED_LEVEL_2, null as any, {
        assignedToName: "Chief Medical Officer",
      });

      assert.match(l1Data.message, /Dr. Aris Thorne/);
      assert.match(l1Data.message, /Level 1/);
      assert.match(l2Data.message, /Chief Medical Officer/);
      assert.match(l2Data.message, /Level 2/);
    });

    it("should format and record TASK_COMPLETED event", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-comp", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.TASK_COMPLETED, sampleActorId, {
        completedByName: "Nurse Clara",
      });

      assert.equal(createdData.eventType, "TASK_COMPLETED");
      assert.match(createdData.message, /Nurse Clara/);
    });

    it("should format and record TASK_CANCELLED event with cancellationReason", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-canc", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent(sampleTaskId, AuditEventType.TASK_CANCELLED, sampleActorId, {
        cancellationReason: "Patient transferred to external trauma center",
      });

      assert.equal(createdData.eventType, "TASK_CANCELLED");
      assert.match(createdData.message, /Patient transferred to external trauma center/);
    });

    it("should support RecordEventOptions object signature and custom message override", async () => {
      let createdData: any = null;
      const mockDb: any = {
        taskTimeline: {
          create: async ({ data }: any) => {
            createdData = data;
            return { id: "timeline-opts", ...data, createdAt: new Date() };
          },
        },
      };

      const service = new AuditService(mockDb);
      await service.recordEvent({
        taskId: sampleTaskId,
        eventType: "TELEMETRY_PING",
        performedBy: sampleActorId,
        message: "Explicit override message text",
        metadata: { sampleKey: 42 },
      });

      assert.equal(createdData.eventType, "TELEMETRY_PING");
      assert.equal(createdData.message, "Explicit override message text");
      assert.equal(createdData.metadata.sampleKey, 42);
    });

    it("should log structured error and rethrow when database creation fails with throwOnError: true", async () => {
      const mockDb: any = {
        taskTimeline: {
          create: async () => {
            throw new Error("Foreign key constraint violation");
          },
        },
      };

      const service = new AuditService(mockDb);
      await assert.rejects(
        async () => {
          await service.recordEvent({
            taskId: sampleTaskId,
            eventType: AuditEventType.STATUS_CHANGED,
            throwOnError: true,
          });
        },
        (err: Error) => {
          assert.match(err.message, /Foreign key constraint violation/);
          return true;
        }
      );
    });

    it("should log structured error and resolve safely when throwOnError is false", async () => {
      const mockDb: any = {
        taskTimeline: {
          create: async () => {
            throw new Error("Non-fatal logging error");
          },
        },
      };

      const service = new AuditService(mockDb);
      const res = await service.recordEvent({
        taskId: sampleTaskId,
        eventType: AuditEventType.STATUS_CHANGED,
        throwOnError: false,
      });

      assert.equal(res, null);
    });

    it("should retrieve chronological timeline for a task", async () => {
      const mockTimelines = [
        { id: "t1", taskId: sampleTaskId, eventType: "TASK_CREATED", createdAt: new Date(1000) },
        { id: "t2", taskId: sampleTaskId, eventType: "STATUS_CHANGED", createdAt: new Date(2000) },
      ];

      const mockDb: any = {
        taskTimeline: {
          findMany: async ({ where, orderBy }: any) => {
            assert.equal(where.taskId, sampleTaskId);
            assert.equal(orderBy.createdAt, "asc");
            return mockTimelines;
          },
        },
      };

      const service = new AuditService(mockDb);
      const res = await service.getTimelineForTask(sampleTaskId);
      assert.equal(res.length, 2);
      assert.equal(res[0].id, "t1");
      assert.equal(res[1].id, "t2");
    });
  });

  // =========================================================================
  // 2. Analytics Service: Operational Metrics & SLA Compliance
  // =========================================================================
  describe("AnalyticsService: Operational Dashboard & Performance", () => {
    const baseTime = new Date("2026-10-13T10:00:00.000Z");

    it("should compute accurate Overview counts and SLA Compliance percentage", async () => {
      const mockTasks: any[] = [
        // Completed on-time: deadline 11:00, completed 10:45
        {
          id: "t1",
          status: TaskStatus.COMPLETED,
          priority: Priority.HIGH,
          escalationLevel: EscalationLevel.NONE,
          createdAt: new Date("2026-10-13T09:00:00.000Z"),
          deadlineAt: new Date("2026-10-13T11:00:00.000Z"),
          completedAt: new Date("2026-10-13T10:45:00.000Z"),
        },
        // Completed breached: deadline 10:00, completed 10:30
        {
          id: "t2",
          status: TaskStatus.COMPLETED,
          priority: Priority.MEDIUM,
          escalationLevel: EscalationLevel.NONE,
          createdAt: new Date("2026-10-13T08:00:00.000Z"),
          deadlineAt: new Date("2026-10-13T10:00:00.000Z"),
          completedAt: new Date("2026-10-13T10:30:00.000Z"),
        },
        // Active breached (deadline 09:30, checkTime 10:00)
        {
          id: "t3",
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.URGENT,
          escalationLevel: EscalationLevel.MANAGER,
          createdAt: new Date("2026-10-13T09:00:00.000Z"),
          deadlineAt: new Date("2026-10-13T09:30:00.000Z"),
          completedAt: null,
        },
        // Active on-track (deadline 12:00, checkTime 10:00)
        {
          id: "t4",
          status: TaskStatus.ASSIGNED,
          priority: Priority.LOW,
          escalationLevel: EscalationLevel.NONE,
          createdAt: new Date("2026-10-13T09:00:00.000Z"),
          deadlineAt: new Date("2026-10-13T12:00:00.000Z"),
          completedAt: null,
        },
        // Cancelled task
        {
          id: "t5",
          status: TaskStatus.CANCELLED,
          priority: Priority.LOW,
          escalationLevel: EscalationLevel.NONE,
          createdAt: new Date("2026-10-13T08:00:00.000Z"),
          deadlineAt: new Date("2026-10-13T12:00:00.000Z"),
          completedAt: null,
        },
      ];

      const mockDb: any = {
        call: { count: async () => 14 },
        task: {
          findMany: async () => mockTasks,
        },
      };

      const service = new AnalyticsService(mockDb);
      const metrics = await service.getOverviewMetrics(baseTime);

      assert.equal(metrics.totalCalls, 14);
      assert.equal(metrics.totalTasks, 5);
      assert.equal(metrics.activeTasks, 2);
      assert.equal(metrics.completedTasks, 2);
      assert.equal(metrics.cancelledTasks, 1);
      assert.equal(metrics.breachedTasks, 1); // t3 is overdue
      assert.equal(metrics.onTimeCompletedTasks, 1); // t1 was on time, t2 was late
      // 1 on-time out of 2 completed = 50.0%
      assert.equal(metrics.slaComplianceRate, 50);

      // Escalation summary for active tasks
      assert.equal(metrics.escalationSummary.level1Warning, 1);
      assert.equal(metrics.escalationSummary.level0Normal, 1);
      assert.equal(metrics.escalationSummary.totalEscalated, 1);
    });

    it("should return 100% SLA compliance rate when there are 0 completed tasks", async () => {
      const mockDb: any = {
        call: { count: async () => 0 },
        task: { findMany: async () => [] },
      };

      const service = new AnalyticsService(mockDb);
      const metrics = await service.getOverviewMetrics(baseTime);

      assert.equal(metrics.totalTasks, 0);
      assert.equal(metrics.completedTasks, 0);
      assert.equal(metrics.slaComplianceRate, 100);
    });

    it("should compute Department Performance breakdown with average completion minutes", async () => {
      const mockDepts: any[] = [
        {
          id: "dept-triage",
          name: "Emergency Triage",
          manager: { id: "mgr-1", fullName: "Dr. Thorne" },
          tasks: [
            // Task 1: Completed in 60 minutes, on time
            {
              id: "t1",
              status: TaskStatus.COMPLETED,
              createdAt: new Date("2026-10-13T09:00:00.000Z"),
              completedAt: new Date("2026-10-13T10:00:00.000Z"),
              deadlineAt: new Date("2026-10-13T10:30:00.000Z"),
            },
            // Task 2: Completed in 120 minutes, on time
            {
              id: "t2",
              status: TaskStatus.COMPLETED,
              createdAt: new Date("2026-10-13T08:00:00.000Z"),
              completedAt: new Date("2026-10-13T10:00:00.000Z"),
              deadlineAt: new Date("2026-10-13T10:00:00.000Z"),
            },
            // Task 3: Active and breached
            {
              id: "t3",
              status: TaskStatus.IN_PROGRESS,
              createdAt: new Date("2026-10-13T08:00:00.000Z"),
              completedAt: null,
              deadlineAt: new Date("2026-10-13T09:30:00.000Z"),
            },
          ],
        },
      ];

      const mockDb: any = {
        department: {
          findMany: async () => mockDepts,
        },
      };

      const service = new AnalyticsService(mockDb);
      const depts = await service.getDepartmentPerformance(baseTime);

      assert.equal(depts.length, 1);
      const triage = depts[0];
      assert.equal(triage.departmentId, "dept-triage");
      assert.equal(triage.departmentName, "Emergency Triage");
      assert.equal(triage.managerName, "Dr. Thorne");
      assert.equal(triage.totalTasks, 3);
      assert.equal(triage.activeTasks, 1);
      assert.equal(triage.breachedTasks, 1);
      assert.equal(triage.completedTasks, 2);
      // Average completion time = (60m + 120m) / 2 = 90.0 minutes
      assert.equal(triage.averageCompletionTimeMinutes, 90.0);
      assert.equal(triage.slaComplianceRate, 100);
    });

    it("should compute Staff Workload distribution correctly", async () => {
      const mockEmployees: any[] = [
        {
          id: "emp-1",
          fullName: "Nurse Clara Oswald",
          email: "clara@hospital.test",
          role: EmployeeRole.STAFF,
          departmentId: "dept-triage",
          isActive: true,
          activeTasksCount: 2,
          department: { id: "dept-triage", name: "Emergency Triage" },
          assignedTasks: [
            { id: "t1", status: TaskStatus.IN_PROGRESS },
            { id: "t2", status: TaskStatus.ASSIGNED },
            { id: "t3", status: TaskStatus.COMPLETED },
          ],
        },
      ];

      const mockDb: any = {
        employee: {
          findMany: async () => mockEmployees,
        },
      };

      const service = new AnalyticsService(mockDb);
      const staff = await service.getStaffWorkload();

      assert.equal(staff.length, 1);
      assert.equal(staff[0].employeeId, "emp-1");
      assert.equal(staff[0].fullName, "Nurse Clara Oswald");
      assert.equal(staff[0].departmentName, "Emergency Triage");
      assert.equal(staff[0].activeTasksCount, 2);
      assert.equal(staff[0].completedTasksCount, 1);
    });

    it("should compute Intent Frequency and percentage distribution from Calls", async () => {
      const mockCalls: any[] = [
        { detectedIntent: "emergency_triage" },
        { detectedIntent: "emergency_triage" },
        { detectedIntent: "emergency_triage" },
        { detectedIntent: "appointment_booking" },
      ];

      const mockDb: any = {
        call: {
          findMany: async () => mockCalls,
        },
      };

      const service = new AnalyticsService(mockDb);
      const intents = await service.getIntentDistribution();

      assert.equal(intents.length, 2);
      assert.equal(intents[0].intent, "emergency_triage");
      assert.equal(intents[0].count, 3);
      assert.equal(intents[0].percentage, 75); // 3 / 4 * 100

      assert.equal(intents[1].intent, "appointment_booking");
      assert.equal(intents[1].count, 1);
      assert.equal(intents[1].percentage, 25);
    });

    it("should compute Escalation Metrics tier counts", async () => {
      const mockActiveTasks: any[] = [
        { escalationLevel: EscalationLevel.NONE },
        { escalationLevel: EscalationLevel.MANAGER },
        { escalationLevel: EscalationLevel.ADMINISTRATOR },
      ];

      const mockDb: any = {
        task: {
          findMany: async () => mockActiveTasks,
        },
      };

      const service = new AnalyticsService(mockDb);
      const esc = await service.getEscalationMetrics();

      assert.equal(esc.level0Count, 1);
      assert.equal(esc.level1Count, 1);
      assert.equal(esc.level2Count, 1);
      assert.equal(esc.totalEscalated, 2);
      assert.equal(esc.activeTasksTotal, 3);
      // 2 / 3 * 100 = 66.67%
      assert.equal(esc.escalationRatePercentage, 66.67);
    });

    it("should aggregate complete dashboard payload", async () => {
      const mockDb: any = {
        call: { count: async () => 10, findMany: async () => [{ detectedIntent: "general" }] },
        task: { findMany: async () => [] },
        department: { findMany: async () => [] },
        employee: { findMany: async () => [] },
      };

      const service = new AnalyticsService(mockDb);
      const dashboard = await service.getDashboard(baseTime);

      assert.ok(dashboard.overview);
      assert.ok(Array.isArray(dashboard.departments));
      assert.ok(Array.isArray(dashboard.staff));
      assert.ok(Array.isArray(dashboard.intents));
      assert.ok(dashboard.escalations);
      assert.equal(typeof dashboard.generatedAt, "string");
    });
  });

  // =========================================================================
  // 3. Controller & Express HTTP Endpoints
  // =========================================================================
  describe("Controller & HTTP Endpoints Integration", () => {
    let origGetOverview: any;
    let origGetDepartments: any;
    let origGetStaff: any;
    let origGetIntents: any;
    let origGetEscalations: any;
    let origGetDashboard: any;
    let origGetTimeline: any;

    beforeEach(() => {
      origGetOverview = analyticsService.getOverviewMetrics;
      origGetDepartments = analyticsService.getDepartmentPerformance;
      origGetStaff = analyticsService.getStaffWorkload;
      origGetIntents = analyticsService.getIntentDistribution;
      origGetEscalations = analyticsService.getEscalationMetrics;
      origGetDashboard = analyticsService.getDashboard;
      origGetTimeline = auditService.getTimelineForTask;
    });

    afterEach(() => {
      analyticsService.getOverviewMetrics = origGetOverview;
      analyticsService.getDepartmentPerformance = origGetDepartments;
      analyticsService.getStaffWorkload = origGetStaff;
      analyticsService.getIntentDistribution = origGetIntents;
      analyticsService.getEscalationMetrics = origGetEscalations;
      analyticsService.getDashboard = origGetDashboard;
      auditService.getTimelineForTask = origGetTimeline;
    });

    it("GET /api/v1/analytics/overview should return 200 and overview data", async () => {
      analyticsService.getOverviewMetrics = async () => ({
        totalCalls: 25,
        totalTasks: 10,
        activeTasks: 6,
        completedTasks: 3,
        cancelledTasks: 1,
        breachedTasks: 1,
        slaComplianceRate: 85.5,
        onTimeCompletedTasks: 3,
        statusBreakdown: {} as any,
        priorityBreakdown: {} as any,
        escalationSummary: { level0Normal: 4, level1Warning: 1, level2Critical: 1, totalEscalated: 2 },
        generatedAt: new Date().toISOString(),
      });

      const res = await request(app).get("/api/v1/analytics/overview");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.totalCalls, 25);
      assert.equal(res.body.data.slaComplianceRate, 85.5);
    });

    it("GET /api/v1/analytics/departments should return 200 and array of departments", async () => {
      analyticsService.getDepartmentPerformance = async () => [
        {
          departmentId: "emergency",
          departmentName: "Emergency Department",
          managerId: "mgr-1",
          managerName: "Dr. Thorne",
          totalTasks: 10,
          activeTasks: 5,
          breachedTasks: 1,
          completedTasks: 4,
          cancelledTasks: 1,
          averageCompletionTimeMinutes: 45.2,
          slaComplianceRate: 90,
        },
      ];

      const res = await request(app).get("/api/v1/analytics/departments");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(Array.isArray(res.body.data), true);
      assert.equal(res.body.data[0].departmentId, "emergency");
    });

    it("GET /api/v1/analytics/staff should return 200 and staff workload array", async () => {
      analyticsService.getStaffWorkload = async () => [
        {
          employeeId: "emp-1",
          fullName: "Nurse Clara",
          email: "clara@test.com",
          role: "STAFF",
          departmentId: "emergency",
          departmentName: "Emergency",
          isActive: true,
          activeTasksCount: 3,
          completedTasksCount: 12,
        },
      ];

      const res = await request(app).get("/api/v1/analytics/staff");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(Array.isArray(res.body.data), true);
      assert.equal(res.body.data[0].fullName, "Nurse Clara");
    });

    it("GET /api/v1/analytics/intents should return 200 and intent distribution array", async () => {
      analyticsService.getIntentDistribution = async () => [
        { intent: "emergency_triage", count: 8, percentage: 80 },
        { intent: "appointment", count: 2, percentage: 20 },
      ];

      const res = await request(app).get("/api/v1/analytics/intents");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.data[0].intent, "emergency_triage");
    });

    it("GET /api/v1/analytics/escalations should return 200 and escalation metrics", async () => {
      analyticsService.getEscalationMetrics = async () => ({
        level0Count: 5,
        level1Count: 2,
        level2Count: 1,
        totalEscalated: 3,
        activeTasksTotal: 8,
        escalationRatePercentage: 37.5,
      });

      const res = await request(app).get("/api/v1/analytics/escalations");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.totalEscalated, 3);
    });

    it("GET /api/v1/analytics/dashboard should return 200 and aggregated dashboard", async () => {
      analyticsService.getDashboard = async () => ({
        overview: { totalCalls: 10 } as any,
        departments: [],
        staff: [],
        intents: [],
        escalations: { totalEscalated: 1 } as any,
        generatedAt: new Date().toISOString(),
      });

      const res = await request(app).get("/api/v1/analytics/dashboard");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.overview);
      assert.ok(res.body.data.escalations);
    });

    it("GET /api/v1/tasks/:id/timeline should return full chronological timeline for a task", async () => {
      auditService.getTimelineForTask = async (taskId: string) => [
        {
          id: "tl-1",
          taskId,
          actorId: sampleActorId,
          eventType: "TASK_CREATED",
          message: "Task created in triage",
          metadata: {},
          createdAt: new Date(),
        } as any,
      ];

      const res = await request(app).get(`/api/v1/tasks/${sampleTaskId}/timeline`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(Array.isArray(res.body.data), true);
      assert.equal(res.body.data[0].eventType, "TASK_CREATED");
    });

    it("GET /api/v1/tasks/:id/timeline should return 400 Bad Request if taskId is not a valid UUID", async () => {
      const res = await request(app).get("/api/v1/tasks/invalid-id/timeline");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });
  });
});
