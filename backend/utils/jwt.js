/**
 * CareOps AI - JWT Utilities
 * 
 * Generates and cryptographically verifies JSON Web Tokens for authentication.
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "careops_production_grade_jwt_secret_token_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generates a signed JWT for an authenticated user
 * @param {object} user - User document or payload object
 * @returns {string} Signed JWT token
 */
function generateToken(user) {
  const userId = user.id || user._id;

  if (!userId) {
    throw new Error("Cannot generate JWT: missing userId");
  }

  const payload = {
    userId: userId.toString(),
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifies a JWT token and returns the decoded payload
 * @param {string} token - Bearer JWT token string
 * @returns {object} Decoded payload with { userId, role, iat, exp }
 */
function verifyToken(token) {
  if (!token) {
    throw new Error("Token is required for verification");
  }

  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
