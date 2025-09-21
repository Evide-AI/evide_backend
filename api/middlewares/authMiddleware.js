import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware - checks for valid JWT token
export const authenticate = (allowedUserTypes) => {
  // Ensure user types are specified for security
  if (!allowedUserTypes || allowedUserTypes.length === 0) {
    throw new Error("authenticate() requires allowedUserTypes to be specified");
  }

  return async (req, res, next) => {
    try {
      let token = null;

      // Method 1: Check Authorization header (Bearer token)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }

      // Method 2: Check cookies for web browsers
      if (!token && req.cookies) {
        for (const userType of allowedUserTypes) {
          const cookieName = `${userType}Token`;
          if (req.cookies[cookieName]) {
            token = req.cookies[cookieName];
            break;
          }
        }
      }

      // Method 3: Check custom header
      if (!token && req.headers["x-access-token"]) {
        token = req.headers["x-access-token"];
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          code: "NO_TOKEN",
        });
      }

      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if user type is allowed for this route
      if (!allowedUserTypes.includes(decoded.userType)) {
        return res.status(401).json({
          success: false,
          message: `Access denied. Required user types: ${allowedUserTypes.join(
            ", "
          )}`,
          code: "INVALID_USER_TYPE",
        });
      }

      // Verify user still exists in database
      const user = await User.findOne({
        where: { id: decoded.userId, role: decoded.userType },
      });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. User not found.",
          code: "USER_NOT_FOUND",
        });
      }

      // Attach user data to request object
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        userType: decoded.userType,
      };

      // Legacy support - also attach to req.admin for admin users
      if (decoded.userType === "admin") {
        req.admin = req.user;
      }

      next();
    } catch (error) {
      console.error("Authentication error:", error);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access denied. Token has expired.",
          code: "TOKEN_EXPIRED",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Access denied. Invalid token.",
          code: "INVALID_TOKEN",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error during authentication.",
        code: "AUTH_ERROR",
      });
    }
  };
};
