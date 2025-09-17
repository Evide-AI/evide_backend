import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (userId, role, userType = "admin") => {
  return jwt.sign(
    {
      userId,
      role,
      userType,
      type: "access",
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      issuer: "evide-backend",
    }
  );
};

export const authenticate = (allowedUserTypes) => {
  // If no user types specified, require explicit definition
  if (!allowedUserTypes || allowedUserTypes.length === 0) {
    throw new Error("authenticate() requires allowedUserTypes to be specified");
  }

  return async (req, res, next) => {
    try {
      let token = null;

      // Check 1 for token in headers
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }

      // Check 2 for token in cookies for Web Browsers
      // Try different cookie names based on allowed user types
      if (!token && req.cookies) {
        for (const userType of allowedUserTypes) {
          const cookieName = `${userType}Token`;
          if (req.cookies[cookieName]) {
            token = req.cookies[cookieName];
            break;
          }
        }
      }

      // Check 3 in x-access-token header
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

      const decoded = jwt.verify(token, JWT_SECRET);

      if (!allowedUserTypes.includes(decoded.userType)) {
        return res.status(401).json({
          success: false,
          message: `Access denied. Required user types: ${allowedUserTypes.join(
            ", "
          )}`,
          code: "INVALID_USER_TYPE",
        });
      }

      const user = await getUserByType(decoded.userType, decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. User not found.",
          code: "USER_NOT_FOUND",
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        userType: decoded.userType,
      };

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

const getUserByType = async (userType, userId) => {
  switch (userType) {
    case "admin":
      return await Admin.findByPk(userId);

    default:
      return null;
  }
};

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

  return (
    mobileIndicators.some((indicator) => userAgent.includes(indicator)) ||
    req.headers["x-mobile-client"] === "true"
  );
};
