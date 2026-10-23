/**
 * CareOps AI - Task Validation Layer
 * 
 * Input sanitization, normalization, and state machine transition rules.
 */

const mongoose = require("mongoose");
const {
  TASK_DEPARTMENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} = require("../models/Task");

/**
 * Normalizes input department to standard uppercase enum.
 */
function normalizeTaskDepartment(dept) {
  if (!dept || typeof dept !== "string") return null;
  const upper = dept.toUpperCase().trim();
  if (TASK_DEPARTMENTS.includes(upper)) return upper;

  if (["RECEPTION", "INTAKE", "FRONT DESK", "SCHEDULING"].some((k) => upper.includes(k))) {
    return "RECEPTION";
  }
  if (["CLINICAL", "DOCTOR", "SURGICAL", "CARDIOLOGY", "ACUTE", "MEDICAL", "RECOVERY", "EMERGENCY", "TRIAGE", "NURSING", "PHARMACY"].some((k) => upper.includes(k))) {
    return "CLINICAL";
  }
  if (["INSURANCE", "RCM", "PRE-AUTH", "PRIOR-AUTH", "BILLING"].some((k) => upper.includes(k))) {
    return "INSURANCE";
  }
  if (["ADMIN", "EXECUTIVE", "GOVERNANCE", "OPERATIONS", "MANAGEMENT"].some((k) => upper.includes(k))) {
    return "ADMINISTRATION";
  }

  return null;
}

/**
 * Normalizes priority to standard uppercase enum.
 */
function normalizeTaskPriority(priority) {
  if (!priority || typeof priority !== "string") return "MEDIUM";
  const upper = priority.toUpperCase().trim();
  if (TASK_PRIORITIES.includes(upper)) return upper;
  if (upper === "CRITICAL" || upper.includes("CRIT") || upper.includes("EMERG")) return "URGENT";
  return "MEDIUM";
}

/**
 * Normalizes status to standard uppercase enum.
 */
function normalizeTaskStatus(status) {
  if (!status || typeof status !== "string") return null;
  const upper = status.toUpperCase().trim();
  if (TASK_STATUSES.includes(upper)) return upper;
  return null;
}

/**
 * Validates payload for task creation.
 */
function validateCreateTask(payload) {
  const { title, description, department, priority, patientId, assignedTo, dueDate } = payload;

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    const error = new Error("Task title is required and must be at least 2 characters");
    error.statusCode = 400;
    throw error;
  }

  if (!description || typeof description !== "string" || description.trim().length < 2) {
    const error = new Error("Task description is required and must be at least 2 characters");
    error.statusCode = 400;
    throw error;
  }

  const normalizedDept = normalizeTaskDepartment(department);
  if (!normalizedDept) {
    const error = new Error(`Invalid department '${department}'. Choose RECEPTION, CLINICAL, INSURANCE, or ADMINISTRATION`);
    error.statusCode = 400;
    throw error;
  }

  if (patientId && !mongoose.Types.ObjectId.isValid(patientId)) {
    const error = new Error("Invalid patientId format");
    error.statusCode = 400;
    throw error;
  }

  if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
    const error = new Error("Invalid assignedTo user ID format");
    error.statusCode = 400;
    throw error;
  }

  let parsedDueDate = null;
  if (dueDate) {
    parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      const error = new Error("Invalid dueDate format");
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    title: title.trim(),
    description: description.trim(),
    department: normalizedDept,
    priority: normalizeTaskPriority(priority),
    patientId: patientId || null,
    assignedTo: assignedTo || null,
    dueDate: parsedDueDate,
  };
}

/**
 * Validates payload for assigning a task.
 */
function validateAssignTask(payload) {
  const { assignedTo } = payload;
  if (!assignedTo) {
    const error = new Error("assignedTo user ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    const error = new Error("Invalid assignedTo user ID format");
    error.statusCode = 400;
    throw error;
  }

  return { assignedTo };
}

/**
 * State machine transition map:
 * CREATED -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> CLOSED
 */
const ALLOWED_TRANSITIONS = {
  CREATED: ["ASSIGNED", "IN_PROGRESS", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "ASSIGNED", "CLOSED"],
  IN_PROGRESS: ["COMPLETED", "CLOSED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
};

/**
 * Validates and enforces task status state machine transitions.
 */
function validateStatusTransition(currentStatus, targetStatusInput, isAdmin = false) {
  const targetStatus = normalizeTaskStatus(targetStatusInput);
  if (!targetStatus) {
    const error = new Error(`Invalid status '${targetStatusInput}'. Allowed statuses: ${TASK_STATUSES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  if (currentStatus === targetStatus) {
    return targetStatus;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    // Admin override exception for reopening a completed/closed task to IN_PROGRESS
    if (isAdmin && (currentStatus === "CLOSED" || currentStatus === "COMPLETED") && targetStatus === "IN_PROGRESS") {
      return targetStatus;
    }

    const error = new Error(
      `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions from ${currentStatus}: ${
        allowed.length > 0 ? allowed.join(", ") : "None (Terminal state)"
      }`
    );
    error.statusCode = 400;
    throw error;
  }

  return targetStatus;
}

module.exports = {
  normalizeTaskDepartment,
  normalizeTaskPriority,
  normalizeTaskStatus,
  validateCreateTask,
  validateAssignTask,
  validateStatusTransition,
  TASK_DEPARTMENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
};
