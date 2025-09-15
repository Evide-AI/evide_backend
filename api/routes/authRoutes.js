import express from "express";
import {
  login,
  logout,
  getProfile,
  refreshToken,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/login", login);

// Protected routes
router.use(authenticate(["admin"]));

router.post("/logout", logout);
router.get("/profile", getProfile);
router.post("/refresh-token", refreshToken);

export default router;
