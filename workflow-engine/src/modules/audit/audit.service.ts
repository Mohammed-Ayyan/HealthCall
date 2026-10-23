import { PrismaClient, TaskTimeline, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client";
import {
  AuditEventType,
  AuditEventTypeEnum,
  RecordEventOptions,
  TimelineQueryFilter,
  PaginatedTimelineResponse,
} from "./audit.types";

export class AuditService {
  private db: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.db = client;
  }

  /**
   * Generates a descriptive default audit message if one was not explicitly supplied.
   */
  public generateEventMessage(
    eventType: string,
    metadata: Record<string, any> = {}
  ): string {
    switch (eventType) {
      case AuditEventType.CALL_LOGGED:
        return metadata.patientName
          ? `Telephony call logged for patient '${metadata.patientName}' (MRN: ${metadata.patientMrn || "N/A"})`
          : "Inbound telephony call logged and linked to task";

      case AuditEventType.TASK_CREATED:
        return metadata.departmentId
          ? `Task initialized in department '${metadata.departmentId}' with priority ${metadata.priority || "MEDIUM"}`
          : "Task initialized and queued in workflow engine";

      case AuditEventType.TASK_ROUTED:
        return `Task routed to department '${metadata.departmentId || "Unknown"}'`;

      case AuditEventType.TASK_ASSIGNED:
        return metadata.employeeName
          ? `Task assigned to ${metadata.employeeName} (${metadata.employeeId})`
          : `Task assigned to employee '${metadata.employeeId || "Unassigned"}'`;

      case AuditEventType.TASK_TRANSFERRED:
        return `Task transferred from department '${metadata.fromDepartmentId || "N/A"}' (employee: ${metadata.fromEmployeeId || "None"}) to '${metadata.toDepartmentId || "N/A"}' (employee: ${metadata.toEmployeeId || "None"})`;

      case AuditEventType.STATUS_CHANGED:
        return `Task status updated from '${metadata.oldStatus || "UNKNOWN"}' to '${metadata.newStatus || "UNKNOWN"}'`;

      case AuditEventType.PRIORITY_UPDATED:
        return `Task priority elevated from '${metadata.oldPriority || "UNKNOWN"}' to '${metadata.newPriority || "UNKNOWN"}'`;

      case AuditEventType.NOTE_ADDED:
        return metadata.authorName
          ? `Internal operational note added by ${metadata.authorName}`
          : "Internal operational note appended to task";

      case AuditEventType.SLA_BREACHED:
        return metadata.breachedByMinutes !== undefined
          ? `SLA deadline breached by ${Math.abs(metadata.breachedByMinutes)} minutes`
          : "Task breached its assigned SLA deadline window";

      case AuditEventType.ESCALATED_LEVEL_1:
        return metadata.managerName
          ? `Escalated to Level 1 (Manager Alert). Department manager ${metadata.managerName} alerted.`
          : "Task escalated to Level 1 (Department Manager Alert)";

      case AuditEventType.ESCALATED_LEVEL_2:
        return metadata.assignedToName
          ? `Escalated to Level 2 (Critical Alert). Priority set to URGENT and reassigned to ${metadata.assignedToName}.`
          : "Task escalated to Level 2 (Critical Hospital Administrator Alert)";

      case AuditEventType.TASK_COMPLETED:
        return metadata.completedByName
          ? `Task successfully completed by ${metadata.completedByName}`
          : "Task marked as COMPLETED";

      case AuditEventType.TASK_CANCELLED:
        return metadata.cancellationReason
          ? `Task cancelled: ${metadata.cancellationReason}`
          : "Task cancelled and retired from queue";

      default:
        return `Workflow event '${eventType}' recorded`;
    }
  }

  /**
   * Overloaded unified event recording method.
   *
   * Signatures supported:
   * 1. recordEvent(taskId, eventType, performedBy?, metadata?, client?)
   * 2. recordEvent(options, client?)
   *
   * Guarantees structured error logging on any failure while preserving transactional integrity.
   */
  async recordEvent(
    taskIdOrOptions: string | RecordEventOptions,
    eventTypeOrClient?: string | Prisma.TransactionClient | PrismaClient,
    performedBy?: string,
    metadata?: Record<string, any>,
    explicitClient?: Prisma.TransactionClient | PrismaClient
  ): Promise<TaskTimeline> {
    let taskId: string;
    let eventType: string;
    let actorId: string | null = null;
    let meta: Record<string, any> = {};
    let customMessage: string | undefined;
    let throwOnError = true;
    let dbClient: any = this.db;

    if (typeof taskIdOrOptions === "object") {
      // Options object signature
      const opts = taskIdOrOptions;
      taskId = opts.taskId;
      eventType = opts.eventType;
      actorId = opts.performedBy || null;
      meta = opts.metadata || {};
      customMessage = opts.message;
      if (opts.throwOnError !== undefined) throwOnError = opts.throwOnError;
      if (eventTypeOrClient && typeof eventTypeOrClient === "object") {
        dbClient = eventTypeOrClient;
      }
    } else {
      // Positional argument signature: (taskId, eventType, performedBy?, metadata?, client?)
      taskId = taskIdOrOptions;
      eventType = typeof eventTypeOrClient === "string" ? eventTypeOrClient : "CUSTOM_EVENT";
      actorId = performedBy || null;
      meta = metadata || {};
      if (explicitClient) {
        dbClient = explicitClient;
      }
    }

    const message = customMessage || this.generateEventMessage(eventType, meta);

    try {
      const createdTimeline = await dbClient.taskTimeline.create({
        data: {
          taskId,
          actorId,
          eventType,
          message,
          metadata: meta,
        },
      });

      return createdTimeline;
    } catch (error: any) {
      // Log structured error context for operational visibility
      console.error("[AuditService] Failed to record timeline audit event:", {
        taskId,
        eventType,
        actorId,
        metadata: meta,
        errorMessage: error?.message || String(error),
        timestamp: new Date().toISOString(),
      });

      if (throwOnError) {
        throw error;
      }
      return null as any;
    }
  }

  /**
   * Retrieves the full chronological audit timeline for a specific task.
   */
  async getTimelineForTask(taskId: string): Promise<TaskTimeline[]> {
    return this.db.taskTimeline.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Queries audit timeline entries across the engine with optional filters and pagination.
   */
  async queryEvents(
    filter: TimelineQueryFilter = {}
  ): Promise<PaginatedTimelineResponse> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskTimelineWhereInput = {};
    if (filter.taskId) where.taskId = filter.taskId;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.eventType) where.eventType = filter.eventType;

    const [data, total] = await Promise.all([
      this.db.taskTimeline.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.taskTimeline.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const auditService = new AuditService();
