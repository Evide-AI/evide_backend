import Admin from "../models/Admin.js";
import {
  generateToken,
  isMobileClient,
} from "../middlewares/authMiddleware.js";

export const allowedUserTypes = ["admin"]; // Add new user types when needed

export const register = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // For now, we allow admins as well, but in future we would retrict userType === admin for register route
    if (!allowedUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user type. Allowed types: ${allowedUserTypes.join(
          ", "
        )}`,
        code: "INVALID_USER_TYPE",
      });
    }

    // Check if user already exists
    const existingUser = await getUserByType(userType, email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
        code: "USER_ALREADY_EXISTS",
      });
    }

    let newUser;
    switch (userType) {
      case "admin":
        newUser = await Admin.create({
          email: email.toLowerCase(),
          password,
          role: "admin",
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid user type for registration",
          code: "INVALID_USER_TYPE",
        });
    }

    res.status(201).json({
      success: true,
      message: `${
        userType.charAt(0).toUpperCase() + userType.slice(1)
      } registered successfully`,
      userType,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
        code: "USER_ALREADY_EXISTS",
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
      code: "REGISTRATION_ERROR",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    if (!allowedUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user type. Allowed types: ${allowedUserTypes.join(
          ", "
        )}`,
        code: "INVALID_USER_TYPE",
      });
    }

    const user = await getUserByType(userType, email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please check your email address.",
        code: "USER_NOT_FOUND",
      });
    }

    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password. Please check your password.",
        code: "INVALID_PASSWORD",
      });
    }

    const token = generateToken(user.id, user.role, userType);

    await user.update({ lastLogin: new Date() });

    const isMobile = isMobileClient(req);

    // Set cookie for web browsers (not for mobile)
    const cookieName = `${userType}Token`; // eg: adminToken.
    if (!isMobile && !req.headers["x-no-cookies"]) {
      res.cookie(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });
    }

    const responseData = {
      success: true,
      message: "Login successful",
      userType,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    };

    // Including token in response for mobile or when requested
    if (isMobile || req.headers["x-include-token"] === "true") {
      responseData.token = token;
      responseData.authMethod = "token";
    } else {
      responseData.authMethod = "cookie";
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
      code: "LOGIN_ERROR",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const userType = req.user?.userType;
    const cookieName = `${userType}Token`;

    if (req.cookies && req.cookies[cookieName]) {
      res.clearCookie(cookieName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
    }

    res.status(200).json({
      success: true,
      message: "Logout successful",
      userType,
    });

    // For mobile apps or browsers,
    // the token stored in local storage must be cleared
    // from their side
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during logout",
      code: "LOGOUT_ERROR",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { userType, id } = req.user;

    const user = await getUserByType(userType, null, id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `${
          userType.charAt(0).toUpperCase() + userType.slice(1)
        } not found`,
        code: "USER_NOT_FOUND",
      });
    }

    res.status(200).json({
      success: true,
      userType,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
      code: "PROFILE_ERROR",
    });
  }
};

const getUserByType = async (userType, email = null, id = null) => {
  const whereClause = {};

  if (email) {
    whereClause.email = email.toLowerCase();
  }
  if (id) {
    whereClause.id = id;
  }

  switch (userType) {
    case "admin":
      return id
        ? await Admin.findByPk(id)
        : await Admin.findOne({ where: whereClause });

    default:
      return null;
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { userType, id } = req.user;

    const user = await getUserByType(userType, null, id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `${
          userType.charAt(0).toUpperCase() + userType.slice(1)
        } not found or inactive`,
        code: "INVALID_USER",
      });
    }

    const newToken = generateToken(user.id, user.role, userType);

    const isMobile = isMobileClient(req);
    const cookieName = `${userType}Token`;

    if (!isMobile && !req.headers["x-no-cookies"]) {
      res.cookie(cookieName, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });
    }

    const responseData = {
      success: true,
      message: "Token refreshed successfully",
      userType,
    };

    if (isMobile || req.headers["x-include-token"] === "true") {
      responseData.token = newToken;
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during token refresh",
      code: "REFRESH_ERROR",
    });
  }
};
