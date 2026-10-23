/**
 * CareOps AI - Department Validation Layer
 */

const mongoose = require("mongoose");

function validateDepartmentCreate(body) {
  const errors = [];

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.push("Department name is required and must be at least 2 characters");
  }

  if (body.name && body.name.trim().length > 100) {
    errors.push("Department name cannot exceed 100 characters");
  }

  if (body.description && typeof body.description !== "string") {
    errors.push("Description must be a text string");
  }

  if (body.managerId) {
    if (!mongoose.Types.ObjectId.isValid(body.managerId)) {
      errors.push("Invalid managerId: must be a valid MongoDB ObjectId");
    }
  }

  if (body.status) {
    const validStatuses = ["ACTIVE", "INACTIVE"];
    const statusUpper = String(body.status).toUpperCase();
    if (!validStatuses.includes(statusUpper)) {
      errors.push("Status must be either ACTIVE or INACTIVE");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateDepartmentUpdate(body) {
  const errors = [];

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push("Department name must be at least 2 characters");
    } else if (body.name.trim().length > 100) {
      errors.push("Department name cannot exceed 100 characters");
    }
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push("Description must be a text string");
  }

  if (body.managerId !== undefined && body.managerId !== null && body.managerId !== "") {
    if (!mongoose.Types.ObjectId.isValid(body.managerId)) {
      errors.push("Invalid managerId: must be a valid MongoDB ObjectId");
    }
  }

  if (body.status !== undefined) {
    const validStatuses = ["ACTIVE", "INACTIVE"];
    const statusUpper = String(body.status).toUpperCase();
    if (!validStatuses.includes(statusUpper)) {
      errors.push("Status must be either ACTIVE or INACTIVE");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateDepartmentCreate,
  validateDepartmentUpdate,
};
