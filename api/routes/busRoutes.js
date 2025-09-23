import express from "express";
import { createBus } from "../controllers/busController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @middleware authenticate
 * @description All bus routes require admin authentication
 * @access Admin only
 */
router.use(authenticate(["admin"]));

router.post("/", createBus);

export default router;
