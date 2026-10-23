/**
 * CareOps AI - Appointment Model
 * 
 * Persistent MongoDB collection schema for hospital appointments,
 * patient bookings, clinical consultations, and triage scheduling.
 */

const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    patientName: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    patientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    patientPhone: {
      type: String,
      trim: true,
    },
    mrn: {
      type: String,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    doctorName: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
    },
    doctorSpecialty: {
      type: String,
      trim: true,
      default: "General Medicine",
    },
    date: {
      type: String,
      required: [true, "Appointment date is required"],
      trim: true,
    },
    time: {
      type: String,
      required: [true, "Appointment time is required"],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "Pavilion 3 (Metro Health)",
    },
    type: {
      type: String,
      trim: true,
      default: "In-Person Consultation",
    },
    status: {
      type: String,
      enum: [
        "confirmed", "pending", "rescheduled", "cancelled", "completed",
        "CONFIRMED", "PENDING", "RESCHEDULED", "CANCELLED", "COMPLETED"
      ],
      default: "confirmed",
      set: (val) => (typeof val === "string" ? val.toLowerCase() : val),
    },
    instructions: {
      type: String,
      trim: true,
      default: "Please arrive 15 minutes before scheduled slot.",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

appointmentSchema.index({ patientUserId: 1 });
appointmentSchema.index({ doctorName: 1 });
appointmentSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
