import express from "express";
import {
  register,
  login,
  logout,
  getProfile,
  refreshToken,
  allowedUserTypes,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * PUBLIC AUTHENTICATION ROUTES
 * No authentication required for these endpoints
 */

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @body {string} email - User email address (required)
 * @body {string} password - User password (required, min 6 chars)
 * @access Public
 * @returns {Object} Success message with user data (excluding password)
 */
router.post("/register", register);

/**
 * @route POST /api/auth/login
 * @desc Universal authentication endpoint for all user types
 * @body {string} email - User email address (required)
 * @body {string} password - User password (required)
 * @access Public
 * @returns {Object} JWT token, user data, and authentication status
 */
router.post("/login", login);

/**
 * PROTECTED AUTHENTICATION ROUTES
 * Universal authentication endpoints for all user types
 * All routes below require valid JWT authentication
 */

/**
 * @middleware authenticate
 * @description All protected routes require valid JWT token
 * @access Private
 */
router.use(authenticate(allowedUserTypes));

/**
 * @route POST /api/auth/logout
 * @desc Logout endpoint for all authenticated users
 * @headers {string} Authorization - Bearer JWT token (required)
 * @access Private (All user types)
 * @returns {Object} Success message confirming logout
 */
router.post("/logout", logout);

/**
 * @route GET /api/auth/profile
 * @desc Get current authenticated user's profile information
 * @headers {string} Authorization - Bearer JWT token (required)
 * @access Private (All user types)
 * @returns {Object} User profile data (excluding sensitive information)
 * @note Returns profile for any authenticated user type
 */
router.get("/profile", getProfile);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh expired JWT token for any authenticated user
 * @headers {string} Authorization - Bearer JWT token (required)
 * @access Private (All user types)
 * @returns {Object} New JWT token and updated authentication data
 * @note Universal token refresh - works for all user types
 */
router.post("/refresh-token", refreshToken);

export default router;
