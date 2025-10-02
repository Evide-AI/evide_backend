import { sequelize } from "../../config/db.js";
import { AppError, asyncHandler } from "../middlewares/errorMiddleware.js";
import Trip from "../models/Trip.js";
import TripStopTime from "../models/TripStopTime.js";
import Stop from "../models/Stop.js";
import Route from "../models/Route.js";
import Bus from "../models/Bus.js";
import { scheduleTripJobs } from "../../scheduler/queue.js";

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

  const routeExists = await Route.findByPk(route_id);
  if (!routeExists) {
    throw new AppError(`Route with ID ${route_id} does not exist`, 400);
  }

  const busExists = await Bus.findByPk(bus_id);
  if (!busExists) {
    throw new AppError(`Bus with ID ${bus_id} does not exist`, 400);
  }

  for (let i = 0; i < stops.length; i++) {
    const stopExists = await Stop.findByPk(stops[i].stop_id);
    if (!stopExists) {
      throw new AppError(
        `Stop with ID ${stops[i].stop_id} does not exist`,
        400,
      );
    }
  }

  const validTripTypes = ["regular", "express", "limited"];
  if (trip_type && !validTripTypes.includes(trip_type)) {
    throw new AppError(
      `trip_type must be one of: ${validTripTypes.join(", ")}`,
      400,
    );
  }

  if (scheduled_start_time >= scheduled_end_time) {
    throw new AppError(
      "scheduled_start_time must be before scheduled_end_time",
      400,
    );
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

    try {
      await scheduleTripJobs(newTrip);
      console.log("Schedule success")
    } catch (error) {
      console.error("Failed to schedule trip jobs:", error);
    }

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

/**
 * @route GET /api/trips
 * @desc Get trip info either all or of a specific route, with or without filters and pagination
 * @access Private (Admin)
 * @example /api/trips?route_id=id&all=true
 */
export const getTripDetails = asyncHandler(async (req, res) => {
  let { limit, page, route_id, is_active, orderby, order, all } = req.query;

  const where = {};
  if (route_id) {
    where.route_id = route_id;
  }
  if (is_active !== undefined) {
    where.is_active = is_active === "true";
  }

  orderby = orderby || "scheduled_start_time";
  order = order?.toLowerCase() === "desc" ? "DESC" : "ASC";

  const queryOptions = {
    where,
    include: [
      {
        model: TripStopTime,
        include: [{ model: Stop }],
      },
    ],
    order: [[orderby, order]],
  };

  if (all === "true") {
    const trips = await Trip.findAll(queryOptions);

    return res.status(200).json({
      success: true,
      message: "All trips retrieved successfully",
      pagination: {
        total: trips.length,
        page: 1,
        limit: trips.length,
        totalPages: 1,
      },
      data: {
        trips: trips,
      },
    });
  }

  limit = limit ? parseInt(limit) : 50;
  page = page ? parseInt(page) : 1;
  const offset = (page - 1) * limit;

  const { count, rows } = await Trip.findAndCountAll({
    ...queryOptions,
    limit,
    offset,
  });

  res.status(200).json({
    success: true,
    message: "Trips retrieved successfully",
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
    data: {
      trips: rows,
    },
  });
});
