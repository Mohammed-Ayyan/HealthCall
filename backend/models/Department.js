/**
 * CareOps AI - Department Data Model
 * 
 * Represents hospital departments, management assignments, and operational status.
 */

const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Department name must be at least 2 characters"],
      maxlength: [100, "Department name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be either ACTIVE or INACTIVE",
      },
      default: "ACTIVE",
      uppercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for manager population
departmentSchema.virtual("manager", {
  ref: "User",
  localField: "managerId",
  foreignField: "_id",
  justOne: true,
});

// Index for query optimization
departmentSchema.index({ status: 1 });

const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);

module.exports = Department;
