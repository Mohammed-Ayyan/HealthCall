/**
 * CareOps AI - Authentication Controller
 * 
 * HTTP request handlers for /api/v1/auth endpoints.
 */

const authService = require("../services/authService");

/**
 * POST /api/v1/auth/register
 * Creates a new user account with role assignment
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role, department, phone, avatar } = req.body;

    const { user, token } = await authService.registerUser({
      name,
      email,
      password,
      role,
      department,
      phone,
      avatar,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "",
      },
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
 * POST /api/v1/auth/login
 * Validates credentials and returns a signed JWT with user profile
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { user, token } = await authService.loginUser({
      email,
      password,
    });

    // Optional: set secure httpOnly cookie if cookies are used
    if (res.cookie) {
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
      },
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
 * GET /api/v1/auth/me
 * Retrieves current authenticated user context
 */
async function me(req, res, next) {
  try {
    // req.user was populated by authMiddleware
    const user = await authService.getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      phone: user.phone || "",
      avatar: user.avatar || "",
      createdAt: user.createdAt,
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
 * POST /api/v1/auth/logout
 * Clears authentication session / cookie
 */
async function logout(req, res) {
  if (res.clearCookie) {
    res.clearCookie("token");
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

module.exports = {
  register,
  login,
  me,
  logout,
};
