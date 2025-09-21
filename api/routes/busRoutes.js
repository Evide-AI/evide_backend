import express from "express";
import {
  getBuses,
  getBusById,
  createBus,
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
 * @route GET /api/buses
 * @desc Get all buses with optional search functionality
 * @query {string} search - Optional search term (bus name, number, or IMEI)
 * @access Private (Admin)
 * @returns {Object} List of buses with count
 */
router.get("/", getBuses);

/**
 * @route GET /api/buses/:id
 * @desc Get single bus by ID
 * @param {string} id - Bus ID
 * @access Private (Admin)
 * @returns {Object} Single bus object
 */
router.get("/:id", getBusById);

/**
 * @route POST /api/buses
 * @desc Create new bus
 * @body {string} bus_name - Bus name (required)
 * @body {string} bus_number - Bus number (required, unique)
 * @body {string} IMEI - 15-digit IMEI number (required, unique)
 * @body {Array} trip_data - Optional trip data array
 * @access Private (Admin)
 * @returns {Object} Created bus object
 */
router.post("/", createBus);

/**
 * @route PUT /api/buses/:id
 * @desc Update existing bus
 * @param {string} id - Bus ID
 * @body {string} bus_name - Bus name (optional)
 * @body {string} bus_number - Bus number (optional)
 * @body {string} IMEI - 15-digit IMEI number (optional)
 * @body {Array} trip_data - Trip data array (optional)
 * @access Private (Admin)
 * @returns {Object} Updated bus object
 */
router.put("/:id", updateBus);

/**
 * @route DELETE /api/buses/:id
 * @desc Delete bus by ID
 * @param {string} id - Bus ID
 * @access Private (Admin)
 * @returns {Object} Success message
 */
router.delete("/:id", deleteBus);

export default router;
