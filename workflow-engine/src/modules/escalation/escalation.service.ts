import {
  PrismaClient,
  EscalationLevel,
  Priority,
  TaskStatus,
  EmployeeRole,
  Prisma,
} from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client";
import { slaService } from "../sla/sla.service";
import {
  EscalationRunResult,
  EscalatedTasksResponse,
} from "./escalation.types";
import { BadRequestError, NotFoundError } from "../../errors/appError";
import { TaskWithDetails } from "../tasks/tasks.types";

export class EscalationService {
  private db: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.db = client;
  }

  /**
   * Normalizes escalation level from number or string representation to Prisma enum.
   */
  public parseEscalationLevel(
    level?: number | string | EscalationLevel | null
  ): EscalationLevel | null {
    if (level === undefined || level === null || level === "") return null;
    const str = String(level).trim().toUpperCase();
    if (str === "0" || str === "NONE" || str === "NORMAL") return EscalationLevel.NONE;
    if (str === "1" || str === "MANAGER" || str === "LEVEL_1" || str === "LEVEL1")
      return EscalationLevel.MANAGER;
    if (
      str === "2" ||
      str === "ADMINISTRATOR" ||
      str === "ADMIN" ||
      str === "LEVEL_2" ||
      str === "LEVEL2"
    )
      return EscalationLevel.ADMINISTRATOR;
    return null;
  }

  /**
   * Core Background Breach Monitor Engine:
   * Scans all active tasks (PENDING, ASSIGNED, IN_PROGRESS) and evaluates SLA deadlines.
   *
   * Business Rules:
   * - Level 1 (Manager Alert):
   *     Triggered when an active task is NEAR_BREACH (<=30m) or BREACHED and escalationLevel is NONE (Level 0).
   *     Tags Department Manager, records timeline 'ESCALATED_TO_LEVEL_1', adds system TaskNote.
   * - Level 2 (Critical Reassignment / Administrator Alert):
   *     Triggered when an active task is BREACHED for > 15 minutes past deadline and escalationLevel is MANAGER (Level 1).
   *     Auto-reassigns to least-loaded Manager in department or Hospital Administrator.
   *     Bumps priority to URGENT. Records timeline 'ESCALATED_TO_LEVEL_2', adds system TaskNote.
   */
  async checkAndEscalateTasks(
    referenceTime: Date = new Date()
  ): Promise<EscalationRunResult> {
    const result: EscalationRunResult = {
      scannedCount: 0,
      escalatedToLevel1Count: 0,
      escalatedToLevel2Count: 0,
      escalatedTaskIds: [],
      errors: [],
    };

    // 1. Query all active, non-terminal tasks
    const activeTasks = await this.db.task.findMany({
      where: {
        status: {
          in: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
        },
      },
      include: {
        department: {
          include: {
            manager: true,
          },
        },
        assignedEmployee: true,
      },
    });

    result.scannedCount = activeTasks.length;

    // 2. Evaluate SLA and apply escalation transitions
    for (const task of activeTasks) {
      try {
        const metrics = slaService.getMetrics(task, referenceTime);

        // --- RULE 2: Level 2 Escalation (Critical Reassignment) ---
        // Active task already at Level 1 that has remained breached for >15 minutes past deadline
        const isBreachedOver15Min =
          metrics.healthStatus === "BREACHED" && metrics.remainingMinutes < -15;

        if (
          task.escalationLevel === EscalationLevel.MANAGER &&
          isBreachedOver15Min
        ) {
          await this.executeLevel2Escalation(task, metrics, referenceTime);
          result.escalatedToLevel2Count++;
          result.escalatedTaskIds.push(task.id);
          continue;
        }

        // --- RULE 1: Level 1 Escalation (Manager Alert) ---
        // Active task at Level 0 that has entered NEAR_BREACH or BREACHED
        const isNearOrBreached =
          metrics.healthStatus === "NEAR_BREACH" ||
          metrics.healthStatus === "BREACHED";

        if (
          task.escalationLevel === EscalationLevel.NONE &&
          isNearOrBreached
        ) {
          await this.executeLevel1Escalation(task, metrics, referenceTime);
          result.escalatedToLevel1Count++;
          result.escalatedTaskIds.push(task.id);
          continue;
        }
      } catch (err: any) {
        result.errors.push({
          taskId: task.id,
          error: err?.message || String(err),
        });
      }
    }

    return result;
  }

  /**
   * Internal Level 1 Escalation Transaction:
   * Sets escalationLevel = MANAGER, tags department manager, records timeline and system note.
   */
  private async executeLevel1Escalation(
    task: any,
    metrics: any,
    now: Date
  ): Promise<void> {
    const deptManager =
      task.department?.manager ||
      (await this.db.employee.findFirst({
        where: {
          departmentId: task.departmentId,
          role: EmployeeRole.MANAGER,
          isActive: true,
        },
      }));

    const managerId = deptManager?.id ?? null;
    const managerName = deptManager ? deptManager.fullName : "Department Manager";

    await this.db.$transaction(async (tx) => {
      // 1. Update task escalation level to MANAGER
      await tx.task.update({
        where: { id: task.id },
        data: {
          escalationLevel: EscalationLevel.MANAGER,
        },
      });

      // 2. Record TaskTimeline event
      await tx.taskTimeline.create({
        data: {
          taskId: task.id,
          actorId: managerId,
          eventType: "ESCALATED_TO_LEVEL_1",
          message: `Task SLA ${metrics.healthStatus} warning. Escalated to Level 1 (Manager Alert). Tagged ${managerName}.`,
          metadata: {
            previousLevel: "NONE",
            newLevel: "MANAGER",
            healthStatus: metrics.healthStatus,
            remainingMinutes: metrics.remainingMinutes,
            departmentId: task.departmentId,
            managerId,
            evaluatedAt: now.toISOString(),
          },
        },
      });

      // 3. Create system audit TaskNote
      await tx.taskNote.create({
        data: {
          taskId: task.id,
          authorId: managerId,
          note: `[AUTOMATED SYSTEM ALERT - LEVEL 1] Task entered ${metrics.healthStatus} status (${metrics.remainingMinutes}m remaining). Department Manager ${managerName} has been alerted.`,
        },
      });
    });
  }

  /**
   * Internal Level 2 Escalation Transaction:
   * Bumps priority to URGENT, auto-reassigns to least-loaded active Manager or Hospital Administrator,
   * updates workload counts, records timeline and system note.
   */
  private async executeLevel2Escalation(
    task: any,
    metrics: any,
    now: Date
  ): Promise<void> {
    // 1. Find least-loaded active Manager in department
    let targetAssignee = await this.db.employee.findFirst({
      where: {
        departmentId: task.departmentId,
        role: EmployeeRole.MANAGER,
        isActive: true,
      },
      orderBy: { activeTasksCount: "asc" },
    });

    // 2. Fallback to Hospital Administrator if no departmental manager available
    if (!targetAssignee) {
      targetAssignee = await this.db.employee.findFirst({
        where: {
          role: EmployeeRole.ADMINISTRATOR,
          isActive: true,
        },
        orderBy: { activeTasksCount: "asc" },
      });
    }

    const previousEmployeeId = task.assignedEmployeeId;
    const newEmployeeId = targetAssignee ? targetAssignee.id : previousEmployeeId;
    const isReassigned = newEmployeeId && newEmployeeId !== previousEmployeeId;

    await this.db.$transaction(async (tx) => {
      // 1. Decrement previous employee active tasks count if reassigned
      if (isReassigned && previousEmployeeId) {
        await tx.employee.update({
          where: { id: previousEmployeeId },
          data: { activeTasksCount: { decrement: 1 } },
        });
      }

      // 2. Increment new employee active tasks count if reassigned
      if (isReassigned && newEmployeeId) {
        await tx.employee.update({
          where: { id: newEmployeeId },
          data: { activeTasksCount: { increment: 1 } },
        });
      }

      // 3. Update task: escalationLevel = ADMINISTRATOR, priority = URGENT, update assignee
      await tx.task.update({
        where: { id: task.id },
        data: {
          escalationLevel: EscalationLevel.ADMINISTRATOR,
          priority: Priority.URGENT,
          assignedEmployeeId: newEmployeeId,
          assignedAt: isReassigned ? now : task.assignedAt,
          status:
            task.status === TaskStatus.PENDING && newEmployeeId
              ? TaskStatus.ASSIGNED
              : task.status,
        },
      });

      const assigneeLabel = targetAssignee
        ? `${targetAssignee.fullName} (${targetAssignee.role})`
        : "Hospital Administration";

      // 4. Record TaskTimeline event
      await tx.taskTimeline.create({
        data: {
          taskId: task.id,
          actorId: newEmployeeId,
          eventType: "ESCALATED_TO_LEVEL_2",
          message: `Critical SLA breach (>15m). Escalated to Level 2. Priority elevated to URGENT. Reassigned to ${assigneeLabel}.`,
          metadata: {
            previousLevel: "MANAGER",
            newLevel: "ADMINISTRATOR",
            previousPriority: task.priority,
            newPriority: "URGENT",
            breachDurationMinutes: Math.abs(metrics.remainingMinutes),
            previousEmployeeId,
            newEmployeeId,
            evaluatedAt: now.toISOString(),
          },
        },
      });

      // 5. Create system audit TaskNote
      await tx.taskNote.create({
        data: {
          taskId: task.id,
          authorId: newEmployeeId,
          note: `[AUTOMATED CRITICAL ALERT - LEVEL 2] Task breached SLA deadline by >15 minutes. Priority elevated to URGENT. Reassigned to ${assigneeLabel}.`,
        },
      });
    });
  }

  /**
   * Manual Escalation:
   * Allows staff or managers to bump a task's escalation level by 1:
   * - Level 0 (NONE) -> Level 1 (MANAGER)
   * - Level 1 (MANAGER) -> Level 2 (ADMINISTRATOR), elevates priority to URGENT
   * - Level 2 (ADMINISTRATOR) -> Rejects (already at maximum level)
   */
  async manualEscalate(
    taskId: string,
    reason: string,
    triggeredBy: string
  ): Promise<TaskWithDetails & { sla: any }> {
    if (!reason || !reason.trim()) {
      throw new BadRequestError("Escalation reason cannot be empty");
    }

    // 1. Verify task exists
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: {
        department: true,
        assignedEmployee: true,
        call: true,
        notes: { include: { author: true } },
        timelines: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!task) {
      throw new NotFoundError(`Task with ID '${taskId}' not found`);
    }

    // 2. Reject terminal tasks
    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new BadRequestError(
        `Cannot escalate a task in terminal state '${task.status}'`
      );
    }

    // 3. Verify triggering employee exists
    const employee = await this.db.employee.findUnique({
      where: { id: triggeredBy },
      select: { id: true, fullName: true, role: true },
    });

    if (!employee) {
      throw new NotFoundError(`Employee with ID '${triggeredBy}' not found`);
    }

    // 4. Determine next escalation tier
    let targetLevel: EscalationLevel;
    let targetEventType: string;
    let updatePriority: Priority | undefined = undefined;

    if (task.escalationLevel === EscalationLevel.NONE) {
      targetLevel = EscalationLevel.MANAGER;
      targetEventType = "ESCALATED_TO_LEVEL_1";
    } else if (task.escalationLevel === EscalationLevel.MANAGER) {
      targetLevel = EscalationLevel.ADMINISTRATOR;
      targetEventType = "ESCALATED_TO_LEVEL_2";
      updatePriority = Priority.URGENT;
    } else {
      throw new BadRequestError(
        "Task is already at maximum escalation level (ADMINISTRATOR / Level 2)"
      );
    }

    const updatedTask = await this.db.$transaction(async (tx) => {
      // 1. Update task
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          escalationLevel: targetLevel,
          ...(updatePriority ? { priority: updatePriority } : {}),
        },
        include: {
          department: true,
          assignedEmployee: true,
          call: true,
          notes: {
            include: { author: true },
            orderBy: { createdAt: "asc" },
          },
          timelines: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // 2. Record TaskTimeline event
      await tx.taskTimeline.create({
        data: {
          taskId,
          actorId: employee.id,
          eventType: targetEventType,
          message: `Manual escalation to ${targetLevel} by ${employee.fullName} (${employee.role}): ${reason.trim()}`,
          metadata: {
            manual: true,
            triggeredBy: employee.id,
            employeeName: employee.fullName,
            employeeRole: employee.role,
            reason: reason.trim(),
            previousLevel: task.escalationLevel,
            newLevel: targetLevel,
            ...(updatePriority ? { newPriority: updatePriority } : {}),
          },
        },
      });

      // 3. Create TaskNote
      await tx.taskNote.create({
        data: {
          taskId,
          authorId: employee.id,
          note: `[MANUAL ESCALATION - ${targetLevel}] ${reason.trim()}`,
        },
      });

      return updated;
    });

    return {
      ...updatedTask,
      sla: slaService.getMetrics(updatedTask),
    };
  }

  /**
   * Retrieves escalated tasks, optionally filtered by level (1 = MANAGER, 2 = ADMINISTRATOR).
   * Enriches each item with dynamic SLA metrics and provides a grouped view.
   */
  async getEscalatedTasks(
    filterLevel?: number | string | EscalationLevel | null
  ): Promise<EscalatedTasksResponse> {
    const parsed = this.parseEscalationLevel(filterLevel);

    const where: Prisma.TaskWhereInput = {
      status: {
        in: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
      },
    };

    if (parsed && parsed !== EscalationLevel.NONE) {
      where.escalationLevel = parsed;
    } else {
      where.escalationLevel = {
        in: [EscalationLevel.MANAGER, EscalationLevel.ADMINISTRATOR],
      };
    }

    const tasks = await this.db.task.findMany({
      where,
      orderBy: [{ deadlineAt: "asc" }, { createdAt: "desc" }],
      include: {
        department: true,
        assignedEmployee: true,
        call: true,
        notes: {
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
        timelines: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const enrichedTasks = tasks.map((t) => ({
      ...t,
      sla: slaService.getMetrics(t),
    }));

    const level1Tasks = enrichedTasks.filter(
      (t) => t.escalationLevel === EscalationLevel.MANAGER
    );
    const level2Tasks = enrichedTasks.filter(
      (t) => t.escalationLevel === EscalationLevel.ADMINISTRATOR
    );

    return {
      data: enrichedTasks,
      grouped: {
        level1: level1Tasks,
        level2: level2Tasks,
      },
      meta: {
        total: enrichedTasks.length,
        level1Count: level1Tasks.length,
        level2Count: level2Tasks.length,
      },
    };
  }
}

export const escalationService = new EscalationService();
