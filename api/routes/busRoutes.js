import express from "express";
import {
  getBuses,
  getBusById,
  addBus,
  updateBus,
  deleteBus,
} from "../controllers/busController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @middleware authenticate
 * @description All bus routes require admin authentication
 * @access Admin only
 */
router.use(authenticate(["admin"]));

/**
 * @route POST /api/buses
 * @desc Create new bus with complete route, stops, and trip data - ALL FIELDS MANDATORY
 * @body {string} bus_number - Bus number (required, unique)
 * @body {string} imei_number - 15-digit IMEI number (required, unique)
 * @body {string} name - Bus name (required)
 * @body {string} route_name - Route name (required)
 * @body {number} total_distance_km - Total route distance in km (required)
 * @body {Array} stops - Array of stop objects with coordinates (required, min 1)
 * @body {Array} trips - Array of trip schedules (required, min 1)
 * @example
 * {
 *   "bus_number": "KA05MN1234",
 *   "imei_number": "123456789012345",
 *   "name": "City Express Bus",
 *   "route_name": "Airport to City Center",
 *   "total_distance_km": 25.5,
 *   "stops": [
 *     {
 *       "name": "Airport Terminal",
 *       "latitude": 12.9698,
 *       "longitude": 77.7500,
 *       "sequence_order": 1,
 *       "travel_time_from_previous_stop_min": 0,
 *       "travel_distance_from_previous_stop": 0,
 *       "dwell_time_minutes": 3
 *     },
 *     {
 *       "name": "City Center",
 *       "latitude": 12.9716,
 *       "longitude": 77.5946,
 *       "sequence_order": 2,
 *       "travel_time_from_previous_stop_min": 25,
 *       "travel_distance_from_previous_stop": 17000,
 *       "dwell_time_minutes": 5
 *     }
 *   ],
 *   "trips": [
 *     {
 *       "scheduled_start_time": "2025-09-21T06:00:00Z",
 *       "scheduled_end_time": "2025-09-21T22:00:00Z",
 *       "trip_type": "regular"
 *     }
 *   ]
 * }
 * @access Private (Admin)
 * @returns {Object} Created bus with all related data
 */
router.post("/", addBus);

export default router;
