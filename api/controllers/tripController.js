import { sequelize } from "../../config/db.js";
import { AppError, asyncHandler } from "../middlewares/errorMiddleware.js";
import Trip from "../models/Trip.js";
import TripStopTime from "../models/TripStopTime.js";

/**
 * @desc Create a trip with stop times
 * @route POST /api/trips/create
 * @access Private (Admin)
 */
export const createTripWithStops = asyncHandler(async (req, res) => {
  const {
    route_id,
    bus_id,
    scheduled_start_time,
    scheduled_end_time,
    trip_type,
    stops,
  } = req.body;

  // Validate mandatory fields
  if (!route_id || !bus_id || !scheduled_start_time || !scheduled_end_time) {
    throw new AppError(
      "route_id, bus_id, scheduled_start_time, and scheduled_end_time are required",
      400,
    );
  }

  if (!stops || !Array.isArray(stops) || stops.length < 2) {
    throw new AppError("At least 2 stops are required for a trip", 400);
  }

  // Step 0: Prevent duplicate trip
  const existingTrip = await Trip.findOne({
    where: {
      route_id,
      bus_id,
      scheduled_start_time,
    },
  });

  if (existingTrip) {
    throw new AppError(
      "A trip already exists with this route, bus, and start time",
      400,
    );
  }

  const transaction = await sequelize.transaction();

  try {
    // Step 1: Create Trip
    const newTrip = await Trip.create(
      {
        route_id,
        bus_id,
        scheduled_start_time,
        scheduled_end_time,
        trip_type: trip_type || "regular",
      },
      { transaction },
    );

    // Step 2: Create TripStopTimes
    const tripStopTimes = [];
    for (let i = 0; i < stops.length; i++) {
      const stopData = stops[i];

      if (!stopData.stop_id) {
        throw new AppError(`Stop ${i + 1}: stop_id is required`, 400);
      }

      const tripStopTime = await TripStopTime.create(
        {
          trip_id: newTrip.id,
          stop_id: stopData.stop_id,
          approx_arrival_time: stopData.approx_arrival_time || null,
          approx_departure_time: stopData.approx_departure_time || null,
        },
        { transaction },
      );

      tripStopTimes.push(tripStopTime);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Trip created successfully with stop times",
      data: {
        trip: newTrip,
        tripStopTimes,
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});
