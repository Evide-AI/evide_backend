import Stop from "../models/Stop.js";
import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import { AppError, asyncHandler } from "../middlewares/errorMiddleware.js";
import {
  findExistingRoute,
  createNewRoute,
} from "../utils/routeMatchingUtils.js";

/**
 * @desc Process stops and create/find route
 * @route POST /api/routes/process-stops
 * @access Private (Admin)
 */
export const processStopsAndRoute = asyncHandler(async (req, res) => {
  const { stops } = req.body;

  // Validate stops array
  if (!stops || !Array.isArray(stops) || stops.length < 2) {
    throw new AppError("At least 2 stops are required", 400);
  }

  // Validate each stop
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (!stop.name || !stop.latitude || !stop.longitude) {
      throw new AppError(
        `Stop ${i + 1}: name, latitude, and longitude are required`,
        400
      );
    }

    // Validate coordinates
    const lat = parseFloat(stop.latitude);
    const lng = parseFloat(stop.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new AppError(
        `Stop ${i + 1}: latitude must be between -90 and 90`,
        400
      );
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new AppError(
        `Stop ${i + 1}: longitude must be between -180 and 180`,
        400
      );
    }

    // Validate optional travel time and distance (if provided)
    if (stop.travel_time_from_previous_stop_min !== undefined) {
      const travelTime = parseFloat(stop.travel_time_from_previous_stop_min);
      if (isNaN(travelTime) || travelTime < 0) {
        throw new AppError(
          `Stop ${
            i + 1
          }: travel_time_from_previous_stop_min must be a non-negative number`,
          400
        );
      }
    }

    if (stop.travel_distance_from_previous_stop !== undefined) {
      const travelDistance = parseFloat(
        stop.travel_distance_from_previous_stop
      );
      if (isNaN(travelDistance) || travelDistance < 0) {
        throw new AppError(
          `Stop ${
            i + 1
          }: travel_distance_from_previous_stop must be a non-negative number`,
          400
        );
      }
    }
  }

  const transaction = await sequelize.transaction();

  try {
    // Step 1: Process stops (create or find existing)
    const processedStops = [];
    const stopProcessingResults = [];

    for (let i = 0; i < stops.length; i++) {
      const stopData = stops[i];

      // Check for existing stop by name (case-insensitive)
      let existingStop = await Stop.findOne(
        {
          where: {
            name: { [Op.iLike]: stopData.name.trim() },
          },
        },
        { transaction }
      );

      if (existingStop) {
        // Store the stop with its travel data
        const stopWithTravelData = {
          ...existingStop.dataValues,
          travel_time_from_previous_stop_min:
            stopData.travel_time_from_previous_stop_min,
          travel_distance_from_previous_stop:
            stopData.travel_distance_from_previous_stop,
        };

        processedStops.push(stopWithTravelData);
        stopProcessingResults.push({
          name: existingStop.name,
          id: existingStop.id,
          status: "existing",
        });
      } else {
        // Create new stop with PostGIS coordinates
        const newStop = await Stop.create(
          {
            name: stopData.name.trim(),
            location: sequelize.fn(
              "ST_SetSRID",
              sequelize.fn(
                "ST_MakePoint",
                stopData.longitude,
                stopData.latitude
              ),
              4326
            ),
          },
          { transaction }
        );

        // Store the stop with its travel data
        const stopWithTravelData = {
          ...newStop.dataValues,
          travel_time_from_previous_stop_min:
            stopData.travel_time_from_previous_stop_min,
          travel_distance_from_previous_stop:
            stopData.travel_distance_from_previous_stop,
        };

        processedStops.push(stopWithTravelData);
        stopProcessingResults.push({
          name: newStop.name,
          id: newStop.id,
          status: "created",
        });
      }
    }

    // Step 2: Get stop IDs array for route matching
    const stopIds = processedStops.map((stop) => stop.id);

    // Step 3: Find existing route or create new one
    let routeData = await findExistingRoute(stopIds);

    if (!routeData) {
      // No existing route found - create new one with travel data
      routeData = await createNewRoute(processedStops, null, null, transaction);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message:
        routeData.matchType === "new"
          ? "New route created with stops"
          : `Existing route found (${routeData.matchType} match)`,
      data: {
        route: {
          id: routeData.route.id,
          route_name: routeData.route.route_name,
          total_distance_km: routeData.route.total_distance_km,
          matchType: routeData.matchType, // 'normal' or 'new'
          isExisting: routeData.matchType !== "new",
        },
        stops: processedStops.map((stop) => ({
          id: stop.id,
          name: stop.name,
        })),
        routeStops: routeData.routeStops.map((rs) => ({
          id: rs.id,
          route_id: rs.route_id,
          stop_id: rs.stop_id,
          sequence_order: rs.sequence_order,
        })),
        processing: {
          stopProcessingResults,
          totalStops: processedStops.length,
          newStopsCreated: stopProcessingResults.filter(
            (s) => s.status === "created"
          ).length,
          existingStopsUsed: stopProcessingResults.filter(
            (s) => s.status === "existing"
          ).length,
          routeStatus:
            routeData.matchType === "new"
              ? "Created new route"
              : `Found existing route (${routeData.matchType} match)`,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});
