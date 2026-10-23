import {
  PrismaClient,
  Task,
  TaskStatus,
  Priority,
  Prisma,
  TaskNote,
} from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client";
import { CreateTaskDTO, ListTasksQueryDTO } from "./tasks.types";

import { slaService } from "../sla/sla.service";

export interface AssignOrTransferParams {
  taskId: string;
  previousDepartmentId: string;
  targetDepartmentId?: string;
  previousEmployeeId?: string | null;
  targetEmployeeId?: string | null;
  actorId?: string;
  isTransfer: boolean;
  message: string;
}

export class TaskRepository {
  private db: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.db = client;
  }

  async create(data: CreateTaskDTO): Promise<Task> {
    const hasEmployee = Boolean(data.assignedEmployeeId);
    const initialStatus = hasEmployee ? TaskStatus.ASSIGNED : TaskStatus.PENDING;
    const now = new Date();
    const deadlineAt =
      data.deadlineAt ||
      slaService.calculateDeadline(now, data.priority || Priority.MEDIUM);

    return this.db.$transaction(async (tx) => {
      // 1. Create Task
      const task = await tx.task.create({
        data: {
          callId: data.callId,
          title: data.title,
          description: data.description,
          departmentId: data.departmentId,
          assignedEmployeeId: data.assignedEmployeeId,
          status: initialStatus,
          priority: data.priority,
          deadlineAt,
          assignedAt: hasEmployee ? now : null,
        },
      });

      // 2. Create Timeline Audit Event
      await tx.taskTimeline.create({
        data: {
          taskId: task.id,
          actorId: data.assignedEmployeeId,
          eventType: "TASK_CREATED",
          message: `Task created in department '${data.departmentId}'${
            hasEmployee ? ` and auto-assigned to employee ${data.assignedEmployeeId}` : ""
          }`,
          metadata: {
            priority: task.priority,
            initialStatus: task.status,
            departmentId: task.departmentId,
          },
        },
      });

      // 3. Increment Employee active tasks count if assigned
      if (hasEmployee && data.assignedEmployeeId) {
        await tx.employee.update({
          where: { id: data.assignedEmployeeId },
          data: { activeTasksCount: { increment: 1 } },
        });
      }

      return task;
    });
  }

  async findById(id: string) {
    return this.db.task.findUnique({
      where: { id },
      include: {
        department: true,
        assignedEmployee: true,
        call: true,
        notes: {
          include: {
            author: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        timelines: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async findMany(query: ListTasksQueryDTO) {
    const {
      page,
      limit,
      departmentId,
      assignedEmployeeId,
      status,
      priority,
      escalationLevel,
      isOverdue,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.TaskWhereInput = {};

    if (departmentId) where.departmentId = departmentId;
    if (assignedEmployeeId) where.assignedEmployeeId = assignedEmployeeId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (escalationLevel) where.escalationLevel = escalationLevel;

    if (isOverdue === true) {
      where.deadlineAt = { lt: new Date() };
      where.status = {
        notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      };
    } else if (isOverdue === false) {
      where.OR = [
        { deadlineAt: null },
        { deadlineAt: { gte: new Date() } },
        { status: { in: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.db.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ deadlineAt: "asc" }, { createdAt: "desc" }],
        include: {
          department: { select: { id: true, name: true } },
          assignedEmployee: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          _count: {
            select: { notes: true, timelines: true },
          },
        },
      }),
      this.db.task.count({ where }),
    ]);

    return { tasks, total };
  }

  async updateStatus(
    id: string,
    targetStatus: TaskStatus,
    previousStatus: TaskStatus,
    assignedEmployeeId?: string | null,
    reason?: string,
    actorId?: string
  ): Promise<Task> {
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      const updateData: Prisma.TaskUpdateInput = {
        status: targetStatus,
      };

      if (targetStatus === TaskStatus.COMPLETED) {
        updateData.completedAt = now;
      } else if (targetStatus === TaskStatus.ASSIGNED) {
        updateData.assignedAt = now;
      } else if (targetStatus === TaskStatus.PENDING) {
        updateData.assignedAt = null;
        updateData.assignedEmployee = { disconnect: true };
      }

      const updatedTask = await tx.task.update({
        where: { id },
        data: updateData,
        include: {
          department: true,
          assignedEmployee: true,
        },
      });

      // Timeline event
      await tx.taskTimeline.create({
        data: {
          taskId: id,
          actorId: actorId || assignedEmployeeId || null,
          eventType:
            targetStatus === TaskStatus.COMPLETED
              ? "COMPLETED"
              : targetStatus === TaskStatus.CANCELLED
              ? "CANCELLED"
              : "STATUS_CHANGED",
          message: `Status updated from ${previousStatus} to ${targetStatus}${
            reason ? ` (Reason: ${reason})` : ""
          }`,
          metadata: {
            previousStatus,
            newStatus: targetStatus,
            reason: reason || null,
            timestamp: now.toISOString(),
          },
        },
      });

      // Adjust employee activeTaskCount
      if (assignedEmployeeId) {
        if (
          targetStatus === TaskStatus.COMPLETED ||
          targetStatus === TaskStatus.CANCELLED ||
          targetStatus === TaskStatus.PENDING
        ) {
          await tx.employee.update({
            where: { id: assignedEmployeeId },
            data: {
              activeTasksCount: {
                decrement: 1,
              },
            },
          });
        }
      }

      return updatedTask;
    });
  }

  async assignOrTransfer(params: AssignOrTransferParams): Promise<Task> {
    const {
      taskId,
      previousDepartmentId,
      targetDepartmentId,
      previousEmployeeId,
      targetEmployeeId,
      actorId,
      isTransfer,
      message,
    } = params;

    const newDeptId = targetDepartmentId || previousDepartmentId;
    const isEmployeeChanging = previousEmployeeId !== targetEmployeeId;
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      // 1. Decrement previous employee active count if changing
      if (previousEmployeeId && isEmployeeChanging) {
        await tx.employee.update({
          where: { id: previousEmployeeId },
          data: {
            activeTasksCount: {
              decrement: 1,
            },
          },
        });
      }

      // 2. Increment new employee active count if changing
      if (targetEmployeeId && isEmployeeChanging) {
        await tx.employee.update({
          where: { id: targetEmployeeId },
          data: {
            activeTasksCount: {
              increment: 1,
            },
          },
        });
      }

      // 3. Update task
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          departmentId: newDeptId,
          assignedEmployeeId: targetEmployeeId || null,
          status: targetEmployeeId ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
          assignedAt: targetEmployeeId ? now : null,
        },
        include: {
          department: true,
          assignedEmployee: true,
        },
      });

      // 4. Create timeline audit event
      await tx.taskTimeline.create({
        data: {
          taskId,
          actorId: actorId || targetEmployeeId || null,
          eventType: isTransfer ? "TRANSFERRED" : "ASSIGNED",
          message,
          metadata: {
            fromDepartment: previousDepartmentId,
            toDepartment: newDeptId,
            previousEmployeeId: previousEmployeeId || null,
            newEmployeeId: targetEmployeeId || null,
            isTransfer,
            timestamp: now.toISOString(),
          },
        },
      });

      return updatedTask;
    });
  }

  async updatePriority(
    taskId: string,
    newPriority: Priority,
    previousPriority: Priority,
    actorId?: string
  ): Promise<Task> {
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { priority: newPriority },
        include: {
          department: true,
          assignedEmployee: true,
        },
      });

      await tx.taskTimeline.create({
        data: {
          taskId,
          actorId: actorId || null,
          eventType: "PRIORITY_CHANGED",
          message: `Priority changed from ${previousPriority} to ${newPriority}`,
          metadata: {
            previousPriority,
            newPriority,
            timestamp: now.toISOString(),
          },
        },
      });

      return updatedTask;
    });
  }

  async addNote(
    taskId: string,
    authorId: string,
    noteText: string
  ): Promise<TaskNote> {
    const now = new Date();

    return this.db.$transaction(async (tx) => {
      const note = await tx.taskNote.create({
        data: {
          taskId,
          authorId,
          note: noteText,
        },
        include: {
          author: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      });

      await tx.taskTimeline.create({
        data: {
          taskId,
          actorId: authorId,
          eventType: "NOTE_ADDED",
          message: "Internal operational note appended",
          metadata: {
            noteId: note.id,
            authorId,
            timestamp: now.toISOString(),
          },
        },
      });

      return note;
    });
  }

  async listNotes(taskId: string): Promise<TaskNote[]> {
    return this.db.taskNote.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
  }

  async findLeastLoadedActiveEmployee(departmentId: string) {
    return this.db.employee.findFirst({
      where: {
        departmentId,
        isActive: true,
      },
      orderBy: [{ activeTasksCount: "asc" }, { createdAt: "asc" }],
    });
  }
}

export const taskRepository = new TaskRepository();
