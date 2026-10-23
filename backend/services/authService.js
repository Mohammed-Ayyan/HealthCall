/**
 * CareOps AI - Authentication Service
 * 
 * Implements business logic for registration, credential verification,
 * JWT token distribution, and profile retrieval.
 */

const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { USER_ROLES, normalizeRole } = require("../config/roles");

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Registers a new user account
 * @param {object} userData
 * @returns {Promise<{ user: object, token: string }>}
 */
async function registerUser({ name, email, password, role, department = "", phone = "", avatar = "" }) {
  // 1. Validate required fields
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    const error = new Error("Name is required and must be at least 2 characters long");
    error.statusCode = 400;
    throw error;
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    const error = new Error("Password is required and must be at least 6 characters long");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate & normalize role
  const canonicalRole = normalizeRole(role);
  if (!canonicalRole) {
    const error = new Error(
      `Invalid role '${role}'. Supported roles: ${Object.values(USER_ROLES).join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();

  // 3. Check for existing account with this email
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const error = new Error("An account with this email address already exists");
    error.statusCode = 409;
    throw error;
  }

  // 4. Create and persist user (pre-save hook hashes password)
  const newUser = new User({
    name: name.trim(),
    email: cleanEmail,
    password,
    role: canonicalRole,
    department: department ? department.trim() : "",
    phone: phone ? phone.trim() : "",
    avatar: avatar ? avatar.trim() : "",
  });

  await newUser.save();

  // 5. Generate authentication token
  const token = generateToken(newUser);

  return {
    user: newUser.toJSON(),
    token,
  };
}

/**
 * Authenticates user credentials and generates a JWT session
 * @param {object} credentials
 * @returns {Promise<{ user: object, token: string }>}
 */
async function loginUser({ email, password }) {
  if (!email || !password) {
    const error = new Error("Invalid email or password");
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Find user with password included
  const user = await User.findOne({ email: cleanEmail }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 2. Verify password with bcrypt
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 3. Issue JWT
  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Retrieves the authenticated user profile by ID
 * @param {string} userId
 * @returns {Promise<object>} Sanitized user object
 */
async function getCurrentUser(userId) {
  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user.toJSON();
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
