import Bus from "../models/Bus.js";
import { Op } from "sequelize";
import { AppError, asyncHandler } from "../middlewares/errorMiddleware.js";

/**
 * @desc Create a new bus
 * @route POST /api/buses
 */
export const createBus = asyncHandler(async (req, res) => {
  const { bus_number, imei_number, name } = req.body;

  // Validate required fields
  if (!bus_number || !imei_number) {
    throw new AppError(
      "All fields are mandatory: bus_number & imei_number are required",
      400
    );
  }

  // Ensure bus_number is string
  if (typeof bus_number !== "string") {
    throw new AppError("bus_number must be a string", 400);
  }

  // IMEI should be exactly 15 digits
  if (!/^\d{15}$/.test(imei_number)) {
    throw new AppError("imei_number must be exactly 15 digits", 400);
  }

  // Ensure name is string if provided
  if (name && typeof name !== "string") {
    throw new AppError("name must be a string", 400);
  }

  // Check for existing bus based on bus_number and imei_number
  const existingBus = await Bus.findOne({
    where: {
      [Op.or]: [
        { bus_number: bus_number.trim() },
        { imei_number: imei_number.trim() },
      ],
    },
  });

  if (existingBus) {
    const isNumberDuplicate = existingBus.bus_number === bus_number.trim();
    const duplicateField = isNumberDuplicate ? "bus_number" : "imei_number";
    const duplicateMessage = isNumberDuplicate
      ? "Bus number already exists"
      : "IMEI number already exists";

    const error = new AppError(duplicateMessage, 409);
    error.field = duplicateField;
    throw error;
  }

  // Create the bus
  const bus = await Bus.create({
    bus_number: bus_number.trim(),
    imei_number: imei_number.trim(),
    name: name?.trim() || null,
    is_active: true,
  });

  res.status(201).json({
    success: true,
    message: "Bus created successfully",
    data: {
      bus: {
        id: bus.id,
        bus_number: bus.bus_number,
        imei_number: bus.imei_number,
        name: bus.name,
        is_active: bus.is_active,
        createdAt: bus.createdAt,
        updatedAt: bus.updatedAt,
      },
    },
  });
});
