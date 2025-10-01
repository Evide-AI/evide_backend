import Stop from "../models/Stop.js";
import Route from "../models/Route.js";
import RouteStop from "../models/RouteStop.js";
import Bus from "../models/Bus.js";
import BusRoute from "../models/BusRoute.js";
import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import { AppError, asyncHandler } from "../middlewares/errorMiddleware.js";
import {
  findExistingRoute,
  createNewRoute,
} from "../utils/routeMatchingUtils.js";

/**
 * @desc Process stops and create/find route, optionally link to buses
 * @route POST /api/routes/process-stops
 * @access Private (Admin)
 */
export const processStopsAndRoute = asyncHandler(async (req, res) => {
  const { stops, bus_id, bus_ids } = req.body;

  // Validate stops array
  if (!stops || !Array.isArray(stops) || stops.length < 2) {
    throw new AppError("At least 2 stops are required", 400);
  }

  // Validate bus_id or bus_ids if provided
  let busIdsToLink = [];

  if (bus_id !== undefined && bus_ids !== undefined) {
    throw new AppError("Provide either bus_id or bus_ids, not both", 400);
  }

  if (bus_id) {
    // Single bus ID provided
    if (typeof bus_id !== "number" || bus_id <= 0) {
      throw new AppError("bus_id must be a positive integer", 400);
    }
    busIdsToLink = [bus_id];
  } else if (bus_ids) {
    // Multiple bus IDs provided
    if (!Array.isArray(bus_ids) || bus_ids.length === 0) {
      throw new AppError("bus_ids must be a non-empty array", 400);
    }

    // Validate each bus ID
    for (const id of bus_ids) {
      if (typeof id !== "number" || id <= 0) {
        throw new AppError(
          "Each bus_id in bus_ids must be a positive integer",
          400
        );
      }
    }

    // Remove duplicates
    busIdsToLink = [...new Set(bus_ids)];
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
    // If bus IDs provided, validate they exist
    if (busIdsToLink.length > 0) {
      const buses = await Bus.findAll({
        where: {
          id: busIdsToLink,
        },
        attributes: ["id", "bus_number"],
        transaction,
      });

      if (buses.length !== busIdsToLink.length) {
        const foundIds = buses.map((b) => b.id);
        const missingIds = busIdsToLink.filter((id) => !foundIds.includes(id));
        throw new AppError(
          `Bus(es) not found with ID(s): ${missingIds.join(", ")}`,
          404
        );
      }
    }

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

    // Step 4: Link route to bus(es) if bus IDs provided
    const busLinkingResults = [];

    if (busIdsToLink.length > 0) {
      for (const busId of busIdsToLink) {
        // Check if link already exists
        const existingLink = await BusRoute.findOne({
          where: {
            bus_id: busId,
            route_id: routeData.route.id,
          },
          transaction,
        });

        if (existingLink) {
          busLinkingResults.push({
            bus_id: busId,
            route_id: routeData.route.id,
            status: "already_linked",
            link_id: existingLink.id,
          });
        } else {
          // Create new link
          const newLink = await BusRoute.create(
            {
              bus_id: busId,
              route_id: routeData.route.id,
              is_active: true,
            },
            { transaction }
          );

          busLinkingResults.push({
            bus_id: busId,
            route_id: routeData.route.id,
            status: "newly_linked",
            link_id: newLink.id,
          });
        }
      }
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
        busLinking:
          busLinkingResults.length > 0
            ? {
                totalBusesLinked: busLinkingResults.length,
                newlyLinked: busLinkingResults.filter(
                  (r) => r.status === "newly_linked"
                ).length,
                alreadyLinked: busLinkingResults.filter(
                  (r) => r.status === "already_linked"
                ).length,
                details: busLinkingResults,
              }
            : null,
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

/**
 * @desc Get route details by ID
 * @route GET /api/routes/:id
 * @access Private (Admin)
 */
export const getRouteDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const route = await Route.findByPk(id, {
    include: [
      {
        model: RouteStop,
        as: "route_stops",
        include: [
          {
            model: Stop,
          },
        ],
      },
    ],
    order: [["route_stops", "sequence_order", "ASC"]],
  });

  if (!route) {
    return res.status(401).json({
      success: false,
      message: "Route not found",
    });
  }
  res.status(200).json({
    success: true,
    message: "Route found",
    data: route,
  });
});

/**
 * @desc Get all routes linked to a specific bus
 * @route GET /api/routes/by-bus/:busId
 * @access Private (Admin)
 */
export const getRoutesByBusId = asyncHandler(async (req, res) => {
  const { busId } = req.params;

  // Check if bus exists
  const bus = await Bus.findByPk(busId);
  if (!bus) {
    throw new AppError("Bus not found", 404);
  }

  // Fetch all routes linked to this bus
  const busRoutes = await BusRoute.findAll({
    where: {
      bus_id: busId,
      is_active: true,
    },
    include: [
      {
        model: Route,
        include: [
          {
            model: RouteStop,
            as: "route_stops",
            include: [
              {
                model: Stop,
                attributes: ["id", "name"],
              },
            ],
            separate: true,
            order: [["sequence_order", "ASC"]],
          },
        ],
      },
    ],
  });

  // Transform data to include only first and last stops
  const routesWithEndpoints = busRoutes.map((busRoute) => {
    const route = busRoute.route;
    const routeStops = route.route_stops || [];
    const firstStop = routeStops.length > 0 ? routeStops[0].stop : null;
    const lastStop =
      routeStops.length > 0 ? routeStops[routeStops.length - 1].stop : null;

    return {
      id: route.id,
      route_name: route.route_name,
      first_stop: firstStop,
      last_stop: lastStop,
      link_info: {
        id: busRoute.id,
        is_active: busRoute.is_active,
        linked_at: busRoute.createdAt,
      },
    };
  });

  res.status(200).json({
    success: true,
    message: "Routes retrieved successfully for bus",
    data: {
      bus: {
        id: bus.id,
        bus_number: bus.bus_number,
        name: bus.name,
      },
      routes: routesWithEndpoints,
      total: routesWithEndpoints.length,
    },
  });
});
