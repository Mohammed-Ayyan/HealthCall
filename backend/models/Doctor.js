/**
 * CareOps AI - Doctor Profile Model
 * 
 * Represents clinician profiles linked to existing DOCTOR user accounts.
 * Manages clinical specializations, department affiliations, qualifications,
 * consultation availability schedules, and assigned patient rosters.
 */

const mongoose = require("mongoose");

const AvailabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      trim: true,
      default: "Monday",
    },
    start: {
      type: String,
      trim: true,
      default: "09:00",
    },
    end: {
      type: String,
      trim: true,
      default: "17:00",
    },
    slots: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const DoctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Linked User ID is required"],
      unique: true,
      index: true,
    },
    employeeId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [120, "Name cannot exceed 120 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Doctor email is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      index: true,
    },
    qualification: {
      type: String,
      trim: true,
      default: "MBBS, MD",
    },
    experience: {
      type: Number,
      default: 5,
      min: [0, "Experience cannot be negative"],
    },
    availability: {
      type: [mongoose.Schema.Types.Mixed],
      default: [
        { day: "Monday", start: "09:00", end: "17:00", slots: ["10:30 AM", "11:15 AM", "02:00 PM", "04:30 PM"] },
        { day: "Tuesday", start: "09:00", end: "17:00", slots: ["10:30 AM", "11:15 AM", "02:00 PM"] },
        { day: "Wednesday", start: "09:00", end: "17:00", slots: ["10:30 AM", "02:00 PM", "04:30 PM"] },
        { day: "Thursday", start: "09:00", end: "17:00", slots: ["11:15 AM", "02:00 PM"] },
        { day: "Friday", start: "09:00", end: "17:00", slots: ["10:30 AM", "02:00 PM"] },
      ],
    },
    assignedPatients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
      },
    ],
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "ON_LEAVE"],
        message: "{VALUE} is not a valid doctor status",
      },
      default: "ACTIVE",
      index: true,
      set: function (val) {
        if (!val) return "ACTIVE";
        return val.toString().toUpperCase().trim();
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : doc.id;
        if (ret.userId) {
          ret.userId = ret.userId.toString();
        }
        if (Array.isArray(ret.assignedPatients)) {
          ret.assignedPatients = ret.assignedPatients.map((p) =>
            p && p._id ? p._id.toString() : p ? p.toString() : p
          );
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : doc.id;
        if (ret.userId) {
          ret.userId = ret.userId.toString();
        }
        if (Array.isArray(ret.assignedPatients)) {
          ret.assignedPatients = ret.assignedPatients.map((p) =>
            p && p._id ? p._id.toString() : p ? p.toString() : p
          );
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-validate hook to auto-generate a unique Employee ID if none provided
 */
DoctorSchema.pre("validate", function (next) {
  if (!this.employeeId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.employeeId = `DOC-${randomSuffix}`;
  }
  next();
});

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);

module.exports = Doctor;
