/**
 * CareOps AI - Patient Model
 * 
 * Represents hospital patient profiles linked to User accounts.
 * Manages clinical summaries, demographics, emergency contacts,
 * MRN indexing, and soft-deletion status.
 */

const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    mrn: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [120, "Name cannot exceed 120 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Patient email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true,
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      trim: true,
      enum: {
        values: ["Male", "Female", "Other", "Non-Binary", "Prefer not to say", ""],
        message: "{VALUE} is not a valid gender option",
      },
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    bloodGroup: {
      type: String,
      trim: true,
      enum: {
        values: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
        message: "{VALUE} is not a valid blood group",
      },
      default: "",
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: "",
    },
    medicalSummary: {
      type: String,
      trim: true,
      default: "",
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    assignedDoctorName: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    insuranceProvider: {
      type: String,
      trim: true,
      default: "BlueCross Premier PPO",
    },
    insuranceStatus: {
      type: String,
      trim: true,
      default: "Active & Verified",
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "{VALUE} is not a valid patient status",
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
        if (ret.assignedDoctorId) {
          ret.assignedDoctorId = ret.assignedDoctorId.toString();
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
        if (ret.assignedDoctorId) {
          ret.assignedDoctorId = ret.assignedDoctorId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-validate hook to auto-generate a unique MRN if none provided
 */
PatientSchema.pre("validate", function (next) {
  if (!this.mrn) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.mrn = `MRN-${randomSuffix}`;
  }
  next();
});

const Patient = mongoose.models.Patient || mongoose.model("Patient", PatientSchema);

module.exports = Patient;
