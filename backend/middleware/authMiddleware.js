/**
 * CareOps AI - Authentication Middleware
 * 
 * Verifies Bearer JWT tokens on incoming requests, retrieves the active user,
 * and attaches sanitized user context to req.user.
 */

const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  try {
    let token = null;

    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1].trim();
    } else if (req.cookies && req.cookies.token) {
      // Optional cookie fallback
      token = req.cookies.token;
    }

    // 2. Reject if token is missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 3. Verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    // 4. Retrieve user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found or has been revoked",
      });
    }

    // 5. Attach sanitized user context to request
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
}

module.exports = authMiddleware;
