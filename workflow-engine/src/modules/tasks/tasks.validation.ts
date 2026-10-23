import { z } from "zod";
import { TaskStatus, Priority, EscalationLevel } from "@prisma/client";

export const TaskStatusEnum = z.nativeEnum(TaskStatus, {
  errorMap: () => ({
    message:
      "status must be one of: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED",
  }),
});

export const TaskPriorityEnum = z.nativeEnum(Priority, {
  errorMap: () => ({
    message: "priority must be one of: LOW, MEDIUM, HIGH, URGENT",
  }),
});

export const EscalationLevelEnum = z.nativeEnum(EscalationLevel, {
  errorMap: () => ({
    message: "escalationLevel must be one of: NONE, MANAGER, ADMINISTRATOR",
  }),
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid("Invalid Task ID format. Must be a valid UUID."),
});

export const createTaskSchema = z
  .object({
    callId: z.string().uuid("Invalid callId format. Must be a valid UUID.").optional(),
    title: z.string().min(1, "title is required").max(255),
    description: z.string().optional(),
    departmentId: z.string().min(1, "departmentId is required").max(50).optional(),
    assignedEmployeeId: z.string().uuid().optional().nullable(),
    priority: TaskPriorityEnum.optional().default(Priority.MEDIUM),
    deadlineAt: z.coerce.date().optional(),

    // snake_case aliases
    call_id: z.string().uuid().optional(),
    department_id: z.string().min(1).max(50).optional(),
    assigned_employee_id: z.string().uuid().optional().nullable(),
    deadline_at: z.coerce.date().optional(),
  })
  .transform((data) => {
    const callId = data.callId || data.call_id;
    const departmentId = data.departmentId || data.department_id;
    const assignedEmployeeId =
      data.assignedEmployeeId !== undefined
        ? data.assignedEmployeeId
        : data.assigned_employee_id;
    const deadlineAt = data.deadlineAt || data.deadline_at;

    if (!callId) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["callId"],
          message: "callId is required",
        },
      ]);
    }

    if (!departmentId) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["departmentId"],
          message: "departmentId is required",
        },
      ]);
    }

    return {
      callId,
      title: data.title,
      description: data.description,
      departmentId,
      assignedEmployeeId: assignedEmployeeId || undefined,
      priority: data.priority,
      deadlineAt,
    };
  });

export const updateTaskStatusSchema = z
  .object({
    status: TaskStatusEnum,
    reason: z.string().optional(),
    actorId: z.string().uuid().optional().nullable(),
    actor_id: z.string().uuid().optional().nullable(),
  })
  .transform((data) => ({
    status: data.status,
    reason: data.reason,
    actorId: data.actorId || data.actor_id || undefined,
  }));

export const assignTaskSchema = z
  .object({
    employeeId: z.string().uuid("Invalid employeeId format").optional().nullable(),
    departmentId: z.string().min(1).max(50).optional().nullable(),
    autoAssign: z.boolean().optional(),
    actorId: z.string().uuid().optional().nullable(),

    // snake_case aliases
    employee_id: z.string().uuid("Invalid employee_id format").optional().nullable(),
    department_id: z.string().min(1).max(50).optional().nullable(),
    auto_assign: z.boolean().optional(),
    actor_id: z.string().uuid().optional().nullable(),
  })
  .transform((data) => ({
    employeeId:
      data.employeeId !== undefined
        ? data.employeeId
        : data.employee_id !== undefined
        ? data.employee_id
        : undefined,
    departmentId:
      data.departmentId !== undefined
        ? data.departmentId
        : data.department_id !== undefined
        ? data.department_id
        : undefined,
    autoAssign:
      data.autoAssign !== undefined
        ? data.autoAssign
        : data.auto_assign !== undefined
        ? data.auto_assign
        : undefined,
    actorId:
      data.actorId !== undefined
        ? data.actorId
        : data.actor_id !== undefined
        ? data.actor_id
        : undefined,
  }))
  .refine(
    (data) =>
      data.employeeId !== undefined ||
      data.departmentId !== undefined ||
      data.autoAssign === true,
    {
      message:
        "At least one of 'employeeId', 'departmentId', or 'autoAssign: true' must be specified",
    }
  );

export const changePrioritySchema = z
  .object({
    priority: TaskPriorityEnum,
    actorId: z.string().uuid().optional().nullable(),
    actor_id: z.string().uuid().optional().nullable(),
  })
  .transform((data) => ({
    priority: data.priority,
    actorId: data.actorId || data.actor_id || undefined,
  }));

export const createTaskNoteSchema = z
  .object({
    authorId: z.string().uuid("Invalid authorId format. Must be a valid UUID.").optional(),
    author_id: z.string().uuid("Invalid author_id format. Must be a valid UUID.").optional(),
    note: z.string().min(1, "note cannot be empty"),
  })
  .transform((data) => {
    const authorId = data.authorId || data.author_id;
    if (!authorId) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["authorId"],
          message: "authorId is required and must be a valid UUID",
        },
      ]);
    }
    return {
      authorId,
      note: data.note,
    };
  });

export const SLAHealthStatusEnum = z.enum(
  [
    "ON_TRACK",
    "NEAR_BREACH",
    "BREACHED",
    "COMPLETED_ON_TIME",
    "COMPLETED_BREACHED",
  ],
  {
    errorMap: () => ({
      message:
        "slaStatus must be one of: ON_TRACK, NEAR_BREACH, BREACHED, COMPLETED_ON_TIME, COMPLETED_BREACHED",
    }),
  }
);

export const listTasksQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    departmentId: z.string().optional(),
    assignedEmployeeId: z.string().optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    escalationLevel: EscalationLevelEnum.optional(),
    slaStatus: SLAHealthStatusEnum.optional(),
    isOverdue: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "boolean") return val;
        if (val === "true" || val === "1") return true;
        if (val === "false" || val === "0") return false;
        return undefined;
      }),

    // aliases
    department_id: z.string().optional(),
    assigned_employee_id: z.string().optional(),
    escalation_level: EscalationLevelEnum.optional(),
    sla_status: SLAHealthStatusEnum.optional(),
    is_overdue: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "boolean") return val;
        if (val === "true" || val === "1") return true;
        if (val === "false" || val === "0") return false;
        return undefined;
      }),
  })
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    departmentId: data.departmentId || data.department_id,
    assignedEmployeeId: data.assignedEmployeeId || data.assigned_employee_id,
    status: data.status,
    priority: data.priority,
    escalationLevel: data.escalationLevel || data.escalation_level,
    slaStatus: data.slaStatus || data.sla_status,
    isOverdue:
      data.isOverdue !== undefined ? data.isOverdue : data.is_overdue,
  }));

export const escalateTaskSchema = z
  .object({
    reason: z.string().trim().min(1, "reason cannot be empty"),
    employeeId: z.string().uuid("Invalid employeeId format. Must be a valid UUID.").optional(),
    employee_id: z.string().uuid("Invalid employee_id format. Must be a valid UUID.").optional(),
  })
  .transform((data) => {
    const employeeId = data.employeeId || data.employee_id;
    if (!employeeId) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["employeeId"],
          message: "employeeId is required and must be a valid UUID",
        },
      ]);
    }
    return {
      reason: data.reason.trim(),
      employeeId,
    };
  });

const isValidEscalationLevel = (val: unknown): boolean => {
  if (val === undefined || val === null || val === "") return true;
  const s = String(val).trim().toUpperCase();
  return ["1", "2", "MANAGER", "ADMINISTRATOR", "LEVEL_1", "LEVEL_2", "LEVEL1", "LEVEL2"].includes(s);
};

export const listEscalatedTasksQuerySchema = z
  .object({
    escalationLevel: z
      .union([z.string(), z.number()])
      .optional()
      .refine(isValidEscalationLevel, {
        message: "escalationLevel must be 1 (MANAGER) or 2 (ADMINISTRATOR)",
      }),
    escalation_level: z
      .union([z.string(), z.number()])
      .optional()
      .refine(isValidEscalationLevel, {
        message: "escalation_level must be 1 (MANAGER) or 2 (ADMINISTRATOR)",
      }),
  })
  .transform((data) => ({
    escalationLevel:
      data.escalationLevel !== undefined
        ? data.escalationLevel
        : data.escalation_level !== undefined
        ? data.escalation_level
        : undefined,
  }));
