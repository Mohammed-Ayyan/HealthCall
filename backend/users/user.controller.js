/**
 * CareOps AI - User Management Controller Layer
 * 
 * HTTP request handlers for /api/v1/users endpoints.
 */

const userService = require("./user.service");
const {
  validateCreateUser,
  validateUpdateUser,
  validateStatusUpdate,
} = require("./user.validation");

/**
 * GET /api/v1/users
 * Retrieves users with optional filters (role, department, status, search).
 * Authorized: ADMIN, DEPARTMENT_MANAGER
 */
async function getUsers(req, res, next) {
  try {
    const { role, department, status, search } = req.query;

    const users = await userService.listUsers({
      requester: req.user,
      role,
      department,
      status,
      search,
    });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/users/:id
 * Retrieves a single user by ID.
 * Authorized: ADMIN, DEPARTMENT_MANAGER (scoped)
 */
async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById({
      userId: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/users
 * Creates a new hospital user account.
 * Authorized: ADMIN ONLY
 */
async function createUser(req, res, next) {
  try {
    const validation = validateCreateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const createdUser = await userService.createUser(validation.sanitized);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: createdUser,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/v1/users/:id
 * Updates allowed profile fields (name, phone, department, role, avatar).
 * Authorized: ADMIN ONLY
 */
async function updateUser(req, res, next) {
  try {
    const validation = validateUpdateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const updatedUser = await userService.updateUser(
      req.params.id,
      validation.sanitized
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * PATCH /api/v1/users/:id/status
 * Updates user account status (ACTIVE, INACTIVE, SUSPENDED).
 * Authorized: ADMIN ONLY
 */
async function changeStatus(req, res, next) {
  try {
    const validation = validateStatusUpdate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const updatedUser = await userService.changeUserStatus(
      req.params.id,
      validation.status
    );

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/v1/users/:id
 * Soft deactivates a user by setting status to INACTIVE.
 * Authorized: ADMIN ONLY
 */
async function deleteUser(req, res, next) {
  try {
    const deactivatedUser = await userService.softDeleteUser(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      user: deactivatedUser,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  changeStatus,
  deleteUser,
};
