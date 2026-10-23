/**
 * CareOps AI - System Rule & Governance Model
 * 
 * Persists operational rules, AI confidence thresholds, and access control governance in MongoDB.
 */

const mongoose = require("mongoose");

const systemRuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Notification Rules", "AI Settings", "Routing Rules", "Access Rules"],
      default: "Routing Rules",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    value: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const SystemRule = mongoose.models.SystemRule || mongoose.model("SystemRule", systemRuleSchema);

module.exports = SystemRule;
