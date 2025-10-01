import express from "express";
import {
  processStopsAndRoute,
  getRouteDetails,
  getRoutesByBusId,
} from "../controllers/routeController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @middleware authenticate
 * @description All route routes require admin authentication
 * @access Admin only
 */
router.use(authenticate(["admin"]));

/**
 * @route POST /api/routes/process-stops
 * @desc Process stops array and create/find matching route
 * @body {Array} stops - Array of stop objects (required, min 2)
 * @example
 * {
 *   "stops": [
 *     {
 *       "name": "Airport Terminal",
 *       "latitude": 12.9698,
 *       "longitude": 77.7500,
 *       "travel_time_from_previous_stop_min": 0,
 *       "travel_distance_from_previous_stop": 0
 *     },
 *     {
 *       "name": "City Mall",
 *       "latitude": 12.9716,
 *       "longitude": 77.5946,
 *       "travel_time_from_previous_stop_min": 25,
 *       "travel_distance_from_previous_stop": 15.2
 *     },
 *     {
 *       "name": "Downtown Station",
 *       "latitude": 12.9800,
 *       "longitude": 77.6100,
 *       "travel_time_from_previous_stop_min": 12,
 *       "travel_distance_from_previous_stop": 8.7
 *     }
 *   ]
 * }
 * @access Private (Admin)
 * @returns {Object} Route data with stops and processing details
 */
router.post("/process-stops", processStopsAndRoute);

/**
 * @route GET /api/routes/:id
 * @desc Get route details by ID
 * @param {String} id - Route ID
 * @access Private (Admin)
 * @returns {Object} Route data with stops
 */
router.get("/:id", getRouteDetails);

/**
 * @route GET /api/routes/by-bus/:busId
 * @desc Get all routes linked with the given bus with first and last stop details
 * @access Private (Admin)
 * @returns {Object} Array of routes with endpoint stops
 */
router.get("/by-bus/:busId", getRoutesByBusId);

export default router;
