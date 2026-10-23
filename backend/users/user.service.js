/**
 * CareOps AI - User Management Service Layer
 * 
 * Handles database operations, department scoping, queries,
 * updates, and soft deletion for hospital users.
 */

const User = require("../models/User");
const { USER_ROLES, normalizeRole, USER_STATUS, normalizeStatus } = require("../config/roles");

/**
 * Retrieves users matching query filters with department-level RBAC scoping.
 * - Administrators can view all users or filter by any department/role/status.
 * - Department Managers can ONLY view users inside their assigned department.
 * 
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
async function listUsers({ requester, role, department, status, search }) {
  const query = {};

  // 1. Department Scoping Enforcement
  if (requester.role === USER_ROLES.DEPARTMENT_MANAGER) {
    if (!requester.department) {
      const error = new Error("Department Manager does not have an assigned department");
      error.statusCode = 403;
      throw error;
    }
    // Strict restriction: Manager only sees their own department
    query.department = requester.department;
  } else if (department && department.trim()) {
    query.department = department.trim();
  }

  // 2. Role Filter
  if (role) {
    const canonicalRole = normalizeRole(role);
    if (canonicalRole) {
      query.role = canonicalRole;
    }
  }

  // 3. Status Filter
  if (status) {
    const canonicalStatus = normalizeStatus(status);
    if (canonicalStatus) {
      query.status = canonicalStatus;
    }
  }

  // 4. Keyword Search (searches across name and email)
  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");
    query.$or = [{ name: regex }, { email: regex }];
  }

  const users = await User.find(query).sort({ createdAt: -1 });

  return users.map((u) => u.toJSON());
}

/**
 * Retrieves a single user by ID with department scoping for managers.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function getUserById({ userId, requester }) {
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

  // Enforce Department Manager boundary
  if (requester.role === USER_ROLES.DEPARTMENT_MANAGER) {
    if (user.department !== requester.department) {
      const error = new Error("You do not have permission to view users outside your department");
      error.statusCode = 403;
      throw error;
    }
  }

  return user.toJSON();
}

/**
 * Creates a new hospital user account (Admin only)
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createUser(data) {
  // Check for duplicate email
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    const error = new Error("An account with this email address already exists");
    error.statusCode = 409;
    throw error;
  }

  const newUser = new User({
    name: data.name,
    email: data.email,
    password: data.password, // Model pre-save hook hashes with bcrypt
    role: data.role,
    department: data.department || "",
    phone: data.phone || "",
    avatar: data.avatar || "",
    status: data.status || USER_STATUS.ACTIVE,
  });

  await newUser.save();

  // If new user is DOCTOR, automatically provision Doctor collection profile
  if (newUser.role === USER_ROLES.DOCTOR) {
    try {
      const Doctor = require("../models/Doctor");
      const existingDoc = await Doctor.findOne({ email: newUser.email.toLowerCase() });
      if (!existingDoc) {
        await Doctor.create({
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email.toLowerCase(),
          phone: newUser.phone || "",
          department: newUser.department || "Cardiology",
          specialization: newUser.department || "General Medicine",
          qualification: "MBBS, MD",
          experience: 5,
          status: "ACTIVE",
        });
      }
    } catch {
      // Ignore conflict
    }
  }

  return newUser.toJSON();
}

/**
 * Updates an existing user's profile or department/role (Admin only)
 * Password cannot be changed via this method.
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<object>}
 */
async function updateUser(userId, updates) {
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

  // Apply allowed field updates
  if (updates.name !== undefined) user.name = updates.name;
  if (updates.phone !== undefined) user.phone = updates.phone;
  if (updates.department !== undefined) user.department = updates.department;
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.avatar !== undefined) user.avatar = updates.avatar;
  if (updates.status !== undefined) user.status = updates.status;

  await user.save();

  return user.toJSON();
}

/**
 * Transitions user account status between ACTIVE, INACTIVE, and SUSPENDED
 * @param {string} userId
 * @param {string} status
 * @returns {Promise<object>}
 */
async function changeUserStatus(userId, status) {
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

  user.status = status;
  await user.save();

  return user.toJSON();
}

/**
 * Soft deletes a user account by setting status to INACTIVE.
 * Retains audit history and patient/encounter linkages.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function softDeleteUser(userId) {
  return changeUserStatus(userId, USER_STATUS.INACTIVE);
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserStatus,
  softDeleteUser,
};
