import { sequelize } from "../../config/db.js";
import Route from "../models/Route.js";
import RouteStop from "../models/RouteStop.js";

/**
 * @desc Find existing route with same ordered stops
 * @param {Array} stopIds - Array of stop IDs in order [stopId1, stopId2, stopId3]
 * @returns {Object|null} - Existing route data or null if not found
 */
export const findExistingRoute = async (stopIds) => {
  try {
    // Ensure we have at least 2 stops
    if (!stopIds || stopIds.length < 2) {
      return null;
    }

    const stopCount = stopIds.length;

    // Find all routes that have exactly the same number of stops
    const routesWithSameStopCount = await sequelize.query(
      `
      SELECT route_id 
      FROM route_stops 
      GROUP BY route_id 
      HAVING COUNT(*) = :stopCount
    `,
      {
        replacements: { stopCount },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (routesWithSameStopCount.length === 0) {
      return null;
    }

    const routeIds = routesWithSameStopCount.map((r) => r.route_id);

    // Check each route for exact match
    for (const routeId of routeIds) {
      const routeStops = await RouteStop.findAll({
        where: { route_id: routeId },
        order: [["sequence_order", "ASC"]],
      });

      const routeStopIds = routeStops.map((rs) => rs.stop_id);

      // Check normal order: [A, B, C] matches [A, B, C]
      const isNormalMatch = arraysEqual(stopIds, routeStopIds);

      if (isNormalMatch) {
        // Found matching route - get full route data
        const route = await Route.findByPk(routeId);
        const routeStopsWithDetails = await RouteStop.findAll({
          where: { route_id: routeId },
          order: [["sequence_order", "ASC"]],
        });

        return {
          route,
          routeStops: routeStopsWithDetails,
          matchType: "normal",
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding existing route:", error);
    throw error;
  }
};

/**
 * @desc Helper function to compare two arrays for equality
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {boolean}
 */
const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((val, index) => val === arr2[index]);
};

/**
 * @desc Create new route with RouteStop entries
 * @param {Array} stopsWithData - Array of stop objects with travel data
 * @param {string} routeName - Optional route name
 * @returns {Object} - Created route data
 */
export const createNewRoute = async (
  stopsWithData,
  routeName = null,
  total_distance_km = null,
  providedTransaction = null
) => {
  const transaction = providedTransaction || (await sequelize.transaction());

  try {
    // Create the route
    const route = await Route.create(
      {
        route_name: routeName,
        total_distance_km: total_distance_km,
      },
      { transaction }
    );

    // Create RouteStop entries
    const routeStops = [];
    for (let i = 0; i < stopsWithData.length; i++) {
      const stopData = stopsWithData[i];
      const routeStop = await RouteStop.create(
        {
          route_id: route.id,
          stop_id: stopData.id,
          sequence_order: i + 1,
          travel_time_from_previous_stop_min:
            i === 0 ? 0 : stopData.travel_time_from_previous_stop_min || 0,
          travel_distance_from_previous_stop:
            i === 0 ? 0 : stopData.travel_distance_from_previous_stop || 0,
          dwell_time_minutes: 1,
        },
        { transaction }
      );

      routeStops.push(routeStop);
    }

    // Only commit if we created the transaction ourselves
    if (!providedTransaction) {
      await transaction.commit();
    }

    return {
      route,
      routeStops,
      matchType: "new",
    };
  } catch (error) {
    // Only rollback if we created the transaction ourselves
    if (!providedTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
};
