import { TaskStatus } from "@prisma/client";
import { BadRequestError } from "../../errors/appError";

/**
 * Valid state transitions mapping: currentStatus -> allowed next statuses
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELLED,
    TaskStatus.PENDING,
  ],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [], // Terminal state
  [TaskStatus.CANCELLED]: [], // Terminal state
};

export interface TransitionValidationParams {
  currentStatus: TaskStatus;
  targetStatus: TaskStatus;
  assignedEmployeeId: string | null | undefined;
  reason?: string;
}

export class TaskStateMachine {
  /**
   * Validates whether a requested status transition is legally permitted
   * according to hospital workflow governance rules.
   */
  static validateTransition(params: TransitionValidationParams): void {
    const { currentStatus, targetStatus, assignedEmployeeId, reason } = params;

    // 1. Same-state transition check
    if (currentStatus === targetStatus) {
      throw new BadRequestError(
        `Task is already in status '${currentStatus}'`
      );
    }

    // 2. Terminal state check
    if (
      currentStatus === TaskStatus.COMPLETED ||
      currentStatus === TaskStatus.CANCELLED
    ) {
      throw new BadRequestError(
        `Cannot transition task from terminal state '${currentStatus}'`
      );
    }

    // 3. Permitted transition graph check
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Permitted transitions: [${allowed.join(
          ", "
        )}]`
      );
    }

    // 4. Employee assignment requirement for IN_PROGRESS or COMPLETED
    if (
      targetStatus === TaskStatus.IN_PROGRESS ||
      targetStatus === TaskStatus.COMPLETED
    ) {
      if (!assignedEmployeeId) {
        throw new BadRequestError(
          `Cannot transition task to '${targetStatus}' without an assigned employee`
        );
      }
    }

    // 5. Mandatory cancellation reason check
    if (targetStatus === TaskStatus.CANCELLED) {
      if (!reason || !reason.trim()) {
        throw new BadRequestError(
          "Cancelling a task requires a mandatory cancellation reason"
        );
      }
    }
  }

  /**
   * Helper to inspect if a status is terminal
   */
  static isTerminal(status: TaskStatus): boolean {
    return (
      status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED
    );
  }
}
