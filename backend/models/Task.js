/**
 * CareOps AI - Task Model
 * 
 * Persistent MongoDB schema for healthcare operational workflows, action items,
 * and clinical commitments extracted from calls and patient requests.
 */

const mongoose = require("mongoose");

const TASK_DEPARTMENTS = Object.freeze(["RECEPTION", "CLINICAL", "INSURANCE", "ADMINISTRATION"]);
const TASK_PRIORITIES = Object.freeze(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const TASK_STATUSES = Object.freeze(["CREATED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"]);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Task description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdByType: {
      type: String,
      enum: ["USER", "AI_SYSTEM", "SYSTEM"],
      default: "USER",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: {
        values: TASK_DEPARTMENTS,
        message: "{VALUE} is not a valid department. Choose RECEPTION, CLINICAL, INSURANCE, or ADMINISTRATION",
      },
      uppercase: true,
      trim: true,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: "{VALUE} is not a valid priority. Choose LOW, MEDIUM, HIGH, or URGENT",
      },
      default: "MEDIUM",
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: "{VALUE} is not a valid status. Choose CREATED, ASSIGNED, IN_PROGRESS, COMPLETED, or CLOSED",
      },
      default: "CREATED",
      uppercase: true,
      trim: true,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // Extensible metadata prepared for future AI conversation analysis
    aiMetadata: {
      callId: { type: String, default: "" },
      intent: { type: String, default: "" },
      confidenceScore: { type: Number, default: null },
      extractedAction: { type: String, default: "" },
      reviewQueue: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimal operational filtering
taskSchema.index({ department: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model("Task", taskSchema);
module.exports.TASK_DEPARTMENTS = TASK_DEPARTMENTS;
module.exports.TASK_PRIORITIES = TASK_PRIORITIES;
module.exports.TASK_STATUSES = TASK_STATUSES;
