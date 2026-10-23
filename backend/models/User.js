/**
 * CareOps AI - User Model
 * 
 * Represents hospital users across all 6 roles with encrypted passwords
 * and strict RBAC role enum validation.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLES, VALID_ROLES } = require("../config/roles");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Do not return password by default
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: VALID_ROLES,
        message: "{VALUE} is not a valid CareOps role",
      },
      default: USER_ROLES.PATIENT,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "SUSPENDED"],
        message: "{VALUE} is not a valid user status",
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
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : doc.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

/**
 * Pre-save middleware to hash password before persisting to database
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare candidate password against hashed password
 * @param {string} candidatePassword 
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = User;
