import User from "../models/User.js";
import { generateToken, isMobileClient } from "../utils/tokenUtils.js";
import { AppError, asyncHandler } from "../middlewares/errorMiddleware.js";

// Define allowed user roles for the system
export const allowedUserTypes = ["admin"]; // Add new roles as needed

// Register new user (universal)
export const register = asyncHandler(async (req, res) => {
  const { email, password, userType } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  // Validate user type (role)
  if (!allowedUserTypes.includes(userType)) {
    throw new AppError(
      `Invalid user type. Allowed types: ${allowedUserTypes.join(", ")}`,
      400,
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    where: { email: email.toLowerCase(), role: userType },
  });

  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  // Create new user with role
  const newUser = await User.create({
    email: email.toLowerCase(),
    password,
    role: userType,
  });

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
});

// Universal login for all user types
export const login = asyncHandler(async (req, res) => {
  const { email, password, userType } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  if (!allowedUserTypes.includes(userType)) {
    throw new AppError(
      `Invalid user type. Allowed types: ${allowedUserTypes.join(", ")}`,
      400,
    );
  }

  // Find user by role and email
  const user = await User.findOne({
    where: { email: email.toLowerCase(), role: userType },
  });

  if (!user) {
    throw new AppError("User not found. Please check your email address.", 404);
  }

  // Verify password
  const isPasswordValid = await user.checkPassword(password);
  if (!isPasswordValid) {
    throw new AppError("Invalid password. Please check your password.", 401);
  }

  // Generate JWT token
  const token = generateToken(user.id, user.role, userType);

  // Update last login timestamp
  await user.update({ lastLogin: new Date() });

  const isMobile = isMobileClient(req);

  // Set cookie for web browsers (not for mobile)
  const cookieName = `${userType}Token`; // eg: adminToken, etc.
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

  // Include token in response for mobile or when requested
  if (isMobile || req.headers["x-include-token"] === "true") {
    responseData.token = token;
    responseData.authMethod = "token";
  } else {
    responseData.authMethod = "cookie";
  }

  res.status(200).json(responseData);
});

// Logout user and clear authentication
export const logout = asyncHandler(async (req, res) => {
  const userType = req.user?.userType;
  const cookieName = `${userType}Token`;

  // Clear authentication cookie if exists
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

  // Note: Mobile apps must clear tokens from local storage on their side
});
