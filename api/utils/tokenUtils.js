import User from "../models/User";

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

// Refresh JWT token for authenticated user
export const refreshToken = async (req, res) => {
  try {
    const { userType, id } = req.user;

    // Verify user still exists and is active
    const user = await User.findOne({ where: { id, role: userType } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `${
          userType.charAt(0).toUpperCase() + userType.slice(1)
        } not found or inactive`,
        code: "INVALID_USER",
      });
    }

    // Generate new token
    const newToken = generateToken(user.id, user.role, userType);

    const isMobile = isMobileClient(req);
    const cookieName = `${userType}Token`;

    // Set new cookie for web browsers
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

    // Include new token in response for mobile or when requested
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
