import Bus from "../models/Bus.js";
import { Op } from "sequelize";

// Get all buses with optional search functionality
export const getBuses = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const whereClause = {};

    // Search across bus name, number, and IMEI if search term provided
    if (search) {
      whereClause[Op.or] = [
        { bus_name: { [Op.iLike]: `%${search}%` } },
        { bus_number: { [Op.iLike]: `%${search}%` } },
        { IMEI: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const buses = await Bus.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]], // Latest buses first
    });

    res.status(200).json({
      success: true,
      data: {
        buses,
        count: buses.length,
      },
    });
  } catch (error) {
    console.error("Get buses error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching buses",
      code: "FETCH_BUSES_ERROR",
    });
  }
};

// Get a single bus by its ID
export const getBusById = async (req, res) => {
  try {
    const { id } = req.params;

    const bus = await Bus.findByPk(id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
        code: "BUS_NOT_FOUND",
      });
    }

    res.status(200).json({
      success: true,
      data: { bus },
    });
  } catch (error) {
    console.error("Get bus by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching bus",
      code: "FETCH_BUS_ERROR",
    });
  }
};

// Create a new bus with optional trip data
export const createBus = async (req, res) => {
  try {
    const { bus_name, bus_number, IMEI, trip_data } = req.body;

    // Check required fields
    if (!bus_name || !bus_number || !IMEI) {
      return res.status(400).json({
        success: false,
        message: "Bus name, bus number, and IMEI are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Validate IMEI format (must be exactly 15 digits)
    if (!/^\d{15}$/.test(IMEI)) {
      return res.status(400).json({
        success: false,
        message: "IMEI must be exactly 15 digits",
        code: "INVALID_IMEI_FORMAT",
      });
    }

    // Check if bus number or IMEI already exists
    const existingBus = await Bus.findOne({
      where: {
        [Op.or]: [{ bus_number: bus_number.trim() }, { IMEI: IMEI.trim() }],
      },
    });

    if (existingBus) {
      const duplicateField =
        existingBus.bus_number === bus_number.trim() ? "bus_number" : "IMEI";
      return res.status(409).json({
        success: false,
        message: `Bus with this ${duplicateField} already exists`,
        code: "DUPLICATE_BUS",
      });
    }

    // Prepare bus data
    const busData = {
      bus_name: bus_name.trim(),
      bus_number: bus_number.trim().toUpperCase(),
      IMEI: IMEI.trim(),
    };

    // Add trip data if provided (optional field)
    if (trip_data) {
      busData.trip_data = trip_data;
    }

    const bus = await Bus.create(busData);

    res.status(201).json({
      success: true,
      message: "Bus created successfully",
      data: { bus },
    });
  } catch (error) {
    console.error("Create bus error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
        code: "VALIDATION_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while creating bus",
      code: "CREATE_BUS_ERROR",
    });
  }
};

// Update an existing bus
export const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bus_name, bus_number, IMEI, trip_data } = req.body;

    // Check if bus exists
    const bus = await Bus.findByPk(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
        code: "BUS_NOT_FOUND",
      });
    }

    const updateData = {};

    // Update only provided fields
    if (bus_name !== undefined) updateData.bus_name = bus_name.trim();
    if (bus_number !== undefined)
      updateData.bus_number = bus_number.trim().toUpperCase();
    if (IMEI !== undefined) {
      // Validate IMEI format
      if (!/^\d{15}$/.test(IMEI.trim())) {
        return res.status(400).json({
          success: false,
          message: "IMEI must be exactly 15 digits",
          code: "INVALID_IMEI_FORMAT",
        });
      }
      updateData.IMEI = IMEI.trim();
    }
    if (trip_data !== undefined) updateData.trip_data = trip_data;

    // Prevent duplicate bus_number or IMEI by checking other buses (excluding current one)
    if (updateData.bus_number || updateData.IMEI) {
      const duplicateCheck = {};
      if (updateData.bus_number)
        duplicateCheck.bus_number = updateData.bus_number;
      if (updateData.IMEI) duplicateCheck.IMEI = updateData.IMEI;

      const existingBus = await Bus.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: Object.keys(duplicateCheck).map((key) => ({
            [key]: duplicateCheck[key],
          })),
        },
      });

      if (existingBus) {
        const duplicateField =
          existingBus.bus_number === updateData.bus_number
            ? "bus_number"
            : "IMEI";
        return res.status(409).json({
          success: false,
          message: `Bus with this ${duplicateField} already exists`,
          code: "DUPLICATE_BUS",
        });
      }
    }

    await bus.update(updateData);

    res.status(200).json({
      success: true,
      message: "Bus updated successfully",
      data: { bus },
    });
  } catch (error) {
    console.error("Update bus error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
        code: "VALIDATION_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while updating bus",
      code: "UPDATE_BUS_ERROR",
    });
  }
};

// Delete a bus by ID
export const deleteBus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if bus exists before deleting
    const bus = await Bus.findByPk(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
        code: "BUS_NOT_FOUND",
      });
    }

    await bus.destroy();

    res.status(200).json({
      success: true,
      message: "Bus deleted successfully",
      code: "BUS_DELETED",
    });
  } catch (error) {
    console.error("Delete bus error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting bus",
      code: "DELETE_BUS_ERROR",
    });
  }
};
