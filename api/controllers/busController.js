import Bus from "../models/Bus.js";
import { Op } from "sequelize";

export const getBuses = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { bus_name: { [Op.iLike]: `%${search}%` } },
        { bus_number: { [Op.iLike]: `%${search}%` } },
        { IMEI: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const buses = await Bus.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
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

export const createBus = async (req, res) => {
  try {
    const { bus_name, bus_number, IMEI } = req.body;

    if (!bus_name || !bus_number || !IMEI) {
      return res.status(400).json({
        success: false,
        message: "Bus name, bus number, and IMEI are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // IMEI numbers limit should be 15 digits
    if (!/^\d{15}$/.test(IMEI)) {
      return res.status(400).json({
        success: false,
        message: "IMEI must be exactly 15 digits",
        code: "INVALID_IMEI_FORMAT",
      });
    }

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

    const bus = await Bus.create({
      bus_name: bus_name.trim(),
      bus_number: bus_number.trim().toUpperCase(),
      IMEI: IMEI.trim(),
    });

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

export const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bus_name, bus_number, IMEI } = req.body;

    const bus = await Bus.findByPk(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
        code: "BUS_NOT_FOUND",
      });
    }

    const updateData = {};

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

    // Check for duplicates (excluding current bus)
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

export const deleteBus = async (req, res) => {
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
