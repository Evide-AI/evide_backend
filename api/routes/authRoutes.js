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

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.use(authenticate(allowedUserTypes));

router.post("/logout", logout);
router.get("/profile", getProfile);
router.post("/refresh-token", refreshToken);

export default router;
