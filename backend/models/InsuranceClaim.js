/**
 * CareOps AI - Insurance Claim Model
 * 
 * Represents medical insurance claims, prior-authorization workflows,
 * carrier coverage adjudications, and payout records.
 */

const mongoose = require("mongoose");

const CLAIM_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
];

const CLAIM_TYPES = [
  "PRIOR_AUTHORIZATION",
  "POST_OP_COVERAGE",
  "MEDICATION_APPROVAL",
  "DIAGNOSTIC_IMAGING",
  "GENERAL_CONSULTATION",
];

const CLAIM_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const InsuranceClaimSchema = new mongoose.Schema(
  {
    claimNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient ID is required for claim adjudication"],
      index: true,
    },
    insuranceProvider: {
      type: String,
      required: [true, "Insurance provider name is required"],
      trim: true,
      minlength: [2, "Provider name must be at least 2 characters long"],
      maxlength: [120, "Provider name cannot exceed 120 characters"],
      index: true,
    },
    policyNumber: {
      type: String,
      required: [true, "Policy number is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    claimAmount: {
      type: Number,
      required: [true, "Claim amount is required"],
      min: [0, "Claim amount cannot be negative"],
    },
    claimReason: {
      type: String,
      required: [true, "Claim reason / clinical indication is required"],
      trim: true,
      minlength: [3, "Claim reason must be at least 3 characters long"],
      maxlength: [500, "Claim reason cannot exceed 500 characters"],
    },
    claimType: {
      type: String,
      enum: {
        values: CLAIM_TYPES,
        message: "{VALUE} is not a valid claim type",
      },
      default: "PRIOR_AUTHORIZATION",
    },
    priority: {
      type: String,
      enum: {
        values: CLAIM_PRIORITIES,
        message: "{VALUE} is not a valid priority level",
      },
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: CLAIM_STATUSES,
        message: "{VALUE} is not a valid claim status",
      },
      default: "SUBMITTED",
      index: true,
      set: function (val) {
        if (!val) return "SUBMITTED";
        return val.toString().toUpperCase().trim();
      },
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitting user ID is required"],
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: "",
    },
    denialReason: {
      type: String,
      trim: true,
      default: "",
    },
    serviceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    aiMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : doc.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Auto-generate unique Claim Number if not specified
InsuranceClaimSchema.pre("validate", function (next) {
  if (!this.claimNumber) {
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.claimNumber = `CLM-${new Date().getFullYear()}-${randomHex}`;
  }
  next();
});

// Compound indexes for optimal operational querying
InsuranceClaimSchema.index({ patientId: 1, status: 1 });
InsuranceClaimSchema.index({ status: 1, priority: 1 });
InsuranceClaimSchema.index({ insuranceProvider: 1, status: 1 });
InsuranceClaimSchema.index({ createdAt: -1 });

module.exports = mongoose.model("InsuranceClaim", InsuranceClaimSchema);
