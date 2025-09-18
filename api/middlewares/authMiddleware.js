import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Generate JWT token with user information
export const generateToken = (userId, role, userType) => {
  return jwt.sign(
    {
      userId,
      role,
      userType,
      type: "access",
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
      issuer: "evide-backend",
    }
  );
};

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
      const user = await getUserByType(decoded.userType, decoded.userId);
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

      // Handle specific JWT errors with clear messages
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

// Helper function to get user by type - extensible for new user types
const getUserByType = async (userType, userId) => {
  switch (userType) {
    case "admin":
      return await Admin.findByPk(userId);

    // Add new user types here as needed
    default:
      return null;
  }
};

// Detect if request is from mobile client
export const isMobileClient = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const mobileIndicators = [
    "Mobile",
    "Android",
    "iPhone",
    "iPad",
    "BlackBerry",
    "Windows Phone",
    "Opera Mini",
    "IEMobile",
  ];

  // Check user agent or explicit mobile header
  return (
    mobileIndicators.some((indicator) => userAgent.includes(indicator)) ||
    req.headers["x-mobile-client"] === "true"
  );
};
