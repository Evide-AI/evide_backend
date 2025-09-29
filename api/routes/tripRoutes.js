import express from "express";
import { createTripWithStops, getTripDetails } from "../controllers/tripController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @middleware authenticate
 * @description All trip routes require admin authentication
 * @access Admin only
 */
router.use(authenticate(["admin"]));

/**
 * @route POST /api/trips/create
 * @desc Create a trip along with its stop times
 * @body {Object} Trip details including stops (required)
 * @example
 * {
 *   "route_id": 1,
 *   "bus_id": 2,
 *   "scheduled_start_time": "2025-09-25T08:00:00Z",
 *   "scheduled_end_time": "2025-09-25T10:00:00Z",
 *   "trip_type": "regular", (optional)
 *   "stops": [
 *     {
 *       "stop_id": 101,
 *       "approx_arrival_time": "2025-09-25T08:00:00Z",
 *       "approx_departure_time": "2025-09-25T08:05:00Z"
 *     },
 *     {
 *       "stop_id": 102,
 *       "approx_arrival_time": "2025-09-25T08:30:00Z",
 *       "approx_departure_time": "2025-09-25T08:35:00Z"
 *     },
 *     {
 *       "stop_id": 103,
 *       "approx_arrival_time": "2025-09-25T09:15:00Z",
 *       "approx_departure_time": "2025-09-25T09:20:00Z"
 *     }
 *   ]
 * }
 * @access Private (Admin)
 * @returns {Object} Trip data with stop times
 */
router.post("/create", createTripWithStops);

/**
 * @route GET /api/trips
 * @desc get trip info
 * @access private (Admin)
 * @returns {Object} Trip data or Trip data of specific route
 */
router.get("/", getTripDetails);

export default router;
