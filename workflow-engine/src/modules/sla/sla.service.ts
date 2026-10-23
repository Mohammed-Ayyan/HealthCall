import { Priority, TaskStatus } from "@prisma/client";
import { SLAHealthStatus, SLAMetrics } from "./sla.types";

export interface TaskSLAInput {
  createdAt?: Date | string | null;
  assignedAt?: Date | string | null;
  deadlineAt?: Date | string | null;
  completedAt?: Date | string | null;
  status?: TaskStatus | string | null;
  priority?: Priority | null;
}

export class SLAService {
  /**
   * SLA Window durations in milliseconds by priority tier
   */
  public static readonly SLA_WINDOWS_MS: Record<Priority, number> = {
    [Priority.URGENT]: 15 * 60 * 1000, // 15 minutes
    [Priority.HIGH]: 2 * 60 * 60 * 1000, // 2 hours
    [Priority.MEDIUM]: 4 * 60 * 60 * 1000, // 4 hours
    [Priority.LOW]: 24 * 60 * 60 * 1000, // 24 hours
  };

  /**
   * Dynamic deadline calculation based on priority:
   * - URGENT: createdAt + 15m
   * - HIGH: createdAt + 2h
   * - MEDIUM: createdAt + 4h
   * - LOW: createdAt + 24h
   */
  calculateDeadline(createdAt: Date, priority: Priority): Date {
    const baseTime = createdAt.getTime();
    const durationMs =
      SLAService.SLA_WINDOWS_MS[priority] ??
      SLAService.SLA_WINDOWS_MS[Priority.MEDIUM];
    return new Date(baseTime + durationMs);
  }

  /**
   * Evaluates dynamic health status and minutes for a given task.
   * Alias / shorthand for evaluateSLA per Phase 6 requirements.
   */
  getMetrics(task: TaskSLAInput, referenceTime: Date = new Date()): SLAMetrics {
    return this.evaluateSLA(task, referenceTime);
  }

  /**
   * SLA Health Status Evaluator:
   * Evaluates task status, deadline, and timestamps relative to a reference time (default: now).
   *
   * - 'COMPLETED_ON_TIME': task completed before or at deadline.
   * - 'COMPLETED_BREACHED': task completed after deadline.
   * - 'ON_TRACK': active task with > 30 minutes remaining before deadline.
   * - 'NEAR_BREACH': active task within 30 minutes of deadline.
   * - 'BREACHED': active task where current time > deadlineAt.
   */
  evaluateSLA(task: TaskSLAInput, referenceTime: Date = new Date()): SLAMetrics {
    const createdDate =
      task.createdAt && !isNaN(new Date(task.createdAt).getTime())
        ? new Date(task.createdAt)
        : new Date();

    const assignedDate =
      task.assignedAt && !isNaN(new Date(task.assignedAt).getTime())
        ? new Date(task.assignedAt)
        : null;

    const completedDate =
      task.completedAt && !isNaN(new Date(task.completedAt).getTime())
        ? new Date(task.completedAt)
        : null;

    const taskPriority = task.priority ?? Priority.MEDIUM;

    const deadlineDate =
      task.deadlineAt && !isNaN(new Date(task.deadlineAt).getTime())
        ? new Date(task.deadlineAt)
        : this.calculateDeadline(createdDate, taskPriority);

    const isCompleted = task.status === TaskStatus.COMPLETED;

    let healthStatus: SLAHealthStatus;
    let remainingMinutes: number;
    let elapsedMinutes: number;

    const effectiveCompletionDate = isCompleted
      ? completedDate ?? referenceTime
      : null;

    if (isCompleted && effectiveCompletionDate) {
      // Completed Task evaluation
      const diffMs = deadlineDate.getTime() - effectiveCompletionDate.getTime();
      remainingMinutes = Math.round(diffMs / (60 * 1000));
      elapsedMinutes = Math.round(
        (effectiveCompletionDate.getTime() - createdDate.getTime()) / (60 * 1000)
      );

      if (effectiveCompletionDate.getTime() <= deadlineDate.getTime()) {
        healthStatus = "COMPLETED_ON_TIME";
      } else {
        healthStatus = "COMPLETED_BREACHED";
      }
    } else {
      // Active Task evaluation
      const diffMs = deadlineDate.getTime() - referenceTime.getTime();
      remainingMinutes = Math.round(diffMs / (60 * 1000));
      elapsedMinutes = Math.round(
        (referenceTime.getTime() - createdDate.getTime()) / (60 * 1000)
      );

      if (referenceTime.getTime() > deadlineDate.getTime()) {
        healthStatus = "BREACHED";
      } else if (remainingMinutes <= 30) {
        healthStatus = "NEAR_BREACH";
      } else {
        healthStatus = "ON_TRACK";
      }
    }

    return {
      createdAt: createdDate.toISOString(),
      assignedAt: assignedDate ? assignedDate.toISOString() : null,
      deadlineAt: deadlineDate.toISOString(),
      completedAt: completedDate ? completedDate.toISOString() : null,
      healthStatus,
      remainingMinutes,
      elapsedMinutes,
    };
  }
}

export const slaService = new SLAService();
