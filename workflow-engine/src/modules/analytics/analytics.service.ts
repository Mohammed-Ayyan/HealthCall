import {
  PrismaClient,
  TaskStatus,
  Priority,
  EscalationLevel,
} from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client";
import {
  AnalyticsOverview,
  DepartmentPerformance,
  StaffWorkload,
  IntentFrequency,
  EscalationMetrics,
  CompleteAnalyticsDashboard,
} from "./analytics.types";

export class AnalyticsService {
  private db: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.db = client;
  }

  /**
   * Hospital-wide overview operational metrics & SLA compliance.
   */
  async getOverviewMetrics(
    referenceTime: Date = new Date()
  ): Promise<AnalyticsOverview> {
    const [totalCalls, tasks] = await Promise.all([
      this.db.call.count(),
      this.db.task.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          escalationLevel: true,
          createdAt: true,
          deadlineAt: true,
          completedAt: true,
        },
      }),
    ]);

    const statusBreakdown: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.ASSIGNED]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    };

    const priorityBreakdown: Record<Priority, number> = {
      [Priority.LOW]: 0,
      [Priority.MEDIUM]: 0,
      [Priority.HIGH]: 0,
      [Priority.URGENT]: 0,
    };

    let activeTasks = 0;
    let completedTasks = 0;
    let cancelledTasks = 0;
    let breachedTasks = 0;
    let onTimeCompletedTasks = 0;

    let level0Normal = 0;
    let level1Warning = 0;
    let level2Critical = 0;

    const nowMs = referenceTime.getTime();

    for (const task of tasks) {
      // 1. Status breakdown
      if (statusBreakdown[task.status] !== undefined) {
        statusBreakdown[task.status]++;
      }

      // 2. Priority breakdown
      if (priorityBreakdown[task.priority] !== undefined) {
        priorityBreakdown[task.priority]++;
      }

      // 3. Active vs Terminal breakdown
      const isActive =
        task.status === TaskStatus.PENDING ||
        task.status === TaskStatus.ASSIGNED ||
        task.status === TaskStatus.IN_PROGRESS;

      if (isActive) {
        activeTasks++;

        // Check if overdue / breached
        if (task.deadlineAt && new Date(task.deadlineAt).getTime() < nowMs) {
          breachedTasks++;
        }

        // Escalation count for active tasks
        if (task.escalationLevel === EscalationLevel.MANAGER) {
          level1Warning++;
        } else if (task.escalationLevel === EscalationLevel.ADMINISTRATOR) {
          level2Critical++;
        } else {
          level0Normal++;
        }
      } else if (task.status === TaskStatus.COMPLETED) {
        completedTasks++;

        // SLA Compliance for completed tasks
        if (!task.deadlineAt || !task.completedAt) {
          onTimeCompletedTasks++;
        } else if (
          new Date(task.completedAt).getTime() <= new Date(task.deadlineAt).getTime()
        ) {
          onTimeCompletedTasks++;
        }
      } else if (task.status === TaskStatus.CANCELLED) {
        cancelledTasks++;
      }
    }

    const slaComplianceRate =
      completedTasks > 0
        ? Number(((onTimeCompletedTasks / completedTasks) * 100).toFixed(2))
        : 100;

    return {
      totalCalls,
      totalTasks: tasks.length,
      activeTasks,
      completedTasks,
      cancelledTasks,
      breachedTasks,
      slaComplianceRate,
      onTimeCompletedTasks,
      statusBreakdown,
      priorityBreakdown,
      escalationSummary: {
        level0Normal,
        level1Warning,
        level2Critical,
        totalEscalated: level1Warning + level2Critical,
      },
      generatedAt: referenceTime.toISOString(),
    };
  }

  /**
   * Per-department performance, workload, and average completion durations.
   */
  async getDepartmentPerformance(
    referenceTime: Date = new Date()
  ): Promise<DepartmentPerformance[]> {
    const departments = await this.db.department.findMany({
      include: {
        manager: {
          select: { id: true, fullName: true },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            deadlineAt: true,
            completedAt: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const nowMs = referenceTime.getTime();

    return departments.map((dept) => {
      let activeTasks = 0;
      let completedTasks = 0;
      let cancelledTasks = 0;
      let breachedTasks = 0;
      let onTimeCompletedTasks = 0;
      let totalCompletionMinutes = 0;

      for (const task of dept.tasks) {
        const isActive =
          task.status === TaskStatus.PENDING ||
          task.status === TaskStatus.ASSIGNED ||
          task.status === TaskStatus.IN_PROGRESS;

        if (isActive) {
          activeTasks++;
          if (task.deadlineAt && new Date(task.deadlineAt).getTime() < nowMs) {
            breachedTasks++;
          }
        } else if (task.status === TaskStatus.COMPLETED) {
          completedTasks++;

          if (task.completedAt && task.createdAt) {
            const durationMs =
              new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
            totalCompletionMinutes += Math.max(0, durationMs / (1000 * 60));
          }

          if (!task.deadlineAt || !task.completedAt) {
            onTimeCompletedTasks++;
          } else if (
            new Date(task.completedAt).getTime() <= new Date(task.deadlineAt).getTime()
          ) {
            onTimeCompletedTasks++;
          }
        } else if (task.status === TaskStatus.CANCELLED) {
          cancelledTasks++;
        }
      }

      const averageCompletionTimeMinutes =
        completedTasks > 0
          ? Number((totalCompletionMinutes / completedTasks).toFixed(1))
          : 0;

      const slaComplianceRate =
        completedTasks > 0
          ? Number(((onTimeCompletedTasks / completedTasks) * 100).toFixed(2))
          : 100;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        managerId: dept.manager ? dept.manager.id : null,
        managerName: dept.manager ? dept.manager.fullName : null,
        totalTasks: dept.tasks.length,
        activeTasks,
        breachedTasks,
        completedTasks,
        cancelledTasks,
        averageCompletionTimeMinutes,
        slaComplianceRate,
      };
    });
  }

  /**
   * Staff workload distribution across hospital employees.
   */
  async getStaffWorkload(): Promise<StaffWorkload[]> {
    const employees = await this.db.employee.findMany({
      include: {
        department: {
          select: { id: true, name: true },
        },
        assignedTasks: {
          select: { id: true, status: true },
        },
      },
      orderBy: [
        { activeTasksCount: "desc" },
        { fullName: "asc" },
      ],
    });

    return employees.map((emp) => {
      let activeTasksCount = 0;
      let completedTasksCount = 0;

      for (const t of emp.assignedTasks) {
        if (
          t.status === TaskStatus.ASSIGNED ||
          t.status === TaskStatus.IN_PROGRESS
        ) {
          activeTasksCount++;
        } else if (t.status === TaskStatus.COMPLETED) {
          completedTasksCount++;
        }
      }

      // If activeTasksCount matches cached activeTasksCount or fallback
      const activeCount = emp.activeTasksCount ?? activeTasksCount;

      return {
        employeeId: emp.id,
        fullName: emp.fullName,
        email: emp.email,
        role: emp.role,
        departmentId: emp.departmentId,
        departmentName: emp.department ? emp.department.name : "Unknown",
        isActive: emp.isActive,
        activeTasksCount: activeCount,
        completedTasksCount,
      };
    });
  }

  /**
   * Frequency and percentage distribution of detected patient intents from telephony intake.
   */
  async getIntentDistribution(): Promise<IntentFrequency[]> {
    const calls = await this.db.call.findMany({
      select: { detectedIntent: true },
    });

    const total = calls.length;
    if (total === 0) return [];

    const counts: Record<string, number> = {};
    for (const call of calls) {
      const intent = call.detectedIntent || "unclassified";
      counts[intent] = (counts[intent] || 0) + 1;
    }

    const items: IntentFrequency[] = Object.entries(counts).map(
      ([intent, count]) => ({
        intent,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      })
    );

    // Sort descending by frequency
    items.sort((a, b) => b.count - a.count);

    return items;
  }

  /**
   * Escalation metrics breakdown for active tasks.
   */
  async getEscalationMetrics(): Promise<EscalationMetrics> {
    const activeTasks = await this.db.task.findMany({
      where: {
        status: {
          in: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
        },
      },
      select: { escalationLevel: true },
    });

    let level0Count = 0;
    let level1Count = 0;
    let level2Count = 0;

    for (const t of activeTasks) {
      if (t.escalationLevel === EscalationLevel.MANAGER) {
        level1Count++;
      } else if (t.escalationLevel === EscalationLevel.ADMINISTRATOR) {
        level2Count++;
      } else {
        level0Count++;
      }
    }

    const totalEscalated = level1Count + level2Count;
    const activeTasksTotal = activeTasks.length;
    const escalationRatePercentage =
      activeTasksTotal > 0
        ? Number(((totalEscalated / activeTasksTotal) * 100).toFixed(2))
        : 0;

    return {
      level0Count,
      level1Count,
      level2Count,
      totalEscalated,
      activeTasksTotal,
      escalationRatePercentage,
    };
  }

  /**
   * Complete operational dashboard payload aggregating all statistical dimensions.
   */
  async getDashboard(
    referenceTime: Date = new Date()
  ): Promise<CompleteAnalyticsDashboard> {
    const [overview, departments, staff, intents, escalations] =
      await Promise.all([
        this.getOverviewMetrics(referenceTime),
        this.getDepartmentPerformance(referenceTime),
        this.getStaffWorkload(),
        this.getIntentDistribution(),
        this.getEscalationMetrics(),
      ]);

    return {
      overview,
      departments,
      staff,
      intents,
      escalations,
      generatedAt: referenceTime.toISOString(),
    };
  }
}

export const analyticsService = new AnalyticsService();
