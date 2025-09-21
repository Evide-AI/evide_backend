import { sequelize } from "../../config/db";
import { Bus, Route, Stop, Trip, TripStopTime } from "../models";

export const addBus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      // Bus details
      bus_number,
      imei_number,
      name,

      // Route details
      route_name,
      total_distance_km,

      // Stops array with coordinates
      stops, // Eg: [{name: "Stop1", latitude: 12.34, longitude: 56.34, rest of the data}]

      // Trip data - (at least one trip)
      trips,
    } = req.body;

    // Validate all required fields are present
    if (
      !bus_number ||
      !imei_number ||
      !route_name ||
      !total_distance_km ||
      !stops ||
      !Array.isArray(stops) ||
      stops.length === 0 ||
      !trips ||
      !Array.isArray(trips) ||
      trips.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are mandatory: bus_number, imei_number, route_name, total_distance_km, stops array (min 1), and trips array (min 1) are required",
      });
    }

    // Validate stops array structure
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (
        !stop.name ||
        !stop.latitude ||
        !stop.longitude ||
        stop.sequence_order === undefined ||
        stop.travel_time_from_previous_stop_min === undefined ||
        stop.travel_distance_from_previous_stop === undefined ||
        stop.dwell_time_minutes === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: `Stop ${
            i + 1
          }: All fields are mandatory - name, latitude, longitude, sequence_order, travel_time_from_previous_stop_min, travel_distance_from_previous_stop, and dwell_time_minutes are required`,
        });
      }
    }

    // Validate trips array structure
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      if (
        !trip.scheduled_start_time ||
        !trip.scheduled_end_time ||
        !trip.trip_type
      ) {
        return res.status(400).json({
          success: false,
          message: `Trip ${
            i + 1
          }: scheduled_start_time, scheduled_end_time, and trip_type are required`,
        });
      }
    }

    // Step1: Create a bus
    const bus = await Bus.create(
      {
        bus_number,
        imei_number,
        name: name || null,
        is_active: true,
      },
      { transaction }
    );

    // Step 2: Create route
    const route = await Route.create(
      {
        route_name,
        total_distance_km,
      },
      { transaction }
    );

    // Step 3: add desired stops with POSTGIS coordinates
    const createdStops = [];
    for (const stopData of stops) {
      const stop = await Stop.create(
        {
          name: stopData.name,
          location: sequelize.fn(
            "ST_SetSRID",
            sequelize.fn("ST_MakePoint", stopData.longitude, stopData.latitude),
            4326
          ),
        },
        { transaction }
      );

      createdStops.push({
        ...stop.toJSON(),
        originalData: stopData,
      });
    }

    // Step 4: Create Route Stops
    for (const stopData of stops) {
      // find matching stops for this desired route
      const matchingStop = createdStops.find(
        (s) => s.originalData.name === stopData.name
      );

      await RouteStop.create(
        {
          route_id: route.id,
          stop_id: matchingStop.id,
          sequence_order: stopData.sequence_order,
          travel_time_from_previous_stop_min:
            stopData.travel_time_from_previous_stop_min,
          travel_distance_from_previous_stop:
            stopData.travel_distance_from_previous_stop,
          dwell_time_minutes: stopData.dwell_time_minutes,
        },
        { transaction }
      );
    }

    // Step 5: Add trips to db  (at least one trip required)
    const createdTrips = [];
    for (const tripData of trips) {
      const trip = await Trip.create(
        {
          route_id: route.id,
          bus_id: bus.id,
          scheduled_start_time: new Date(tripData.scheduled_start_time),
          scheduled_end_time: new Date(tripData.scheduled_end_time),
          trip_type: tripData.trip_type,
          is_active: true,
        },
        { transaction }
      );

      createdTrips.push(trip);

      // Step 6: Create TripStopTimes for each trip if a trip exists
      for (const stopData of stops) {
        const matchingStop = createdStops.find(
          (s) => s.originalData.name === stopData.name
        );

        // Calculate approximate arrival and departure times based on sequence and travel time
        let arrivalTime = new Date(tripData.scheduled_start_time);
        let departureTime = new Date(tripData.scheduled_start_time);

        if (stopData.sequence_order > 1) {
          // Calculate cumulative travel time for stops after the first one
          const previousStops = stops.filter(
            (s) => s.sequence_order < stopData.sequence_order
          );
          const cumulativeTravelTime = previousStops.reduce(
            (total, prevStop) => {
              return (
                total +
                (prevStop.travel_time_from_previous_stop_min || 0) +
                (prevStop.dwell_time_minutes || 1)
              );
            },
            0
          );

          arrivalTime = new Date(
            arrivalTime.getTime() + cumulativeTravelTime * 60000
          ); // Converting minutes to milliseconds
        }

        departureTime = new Date(
          arrivalTime.getTime() + (stopData.dwell_time_minutes || 1) * 60000
        );

        await TripStopTime.create(
          {
            trip_id: trip.id,
            stop_id: matchingStop.id,
            approx_arrival_time: arrivalTime,
            approx_departure_time: departureTime,
          },
          { transaction }
        );
      }
    }

    // commit our transaction
    await transaction.commit();

    // Return success response
    res.status(201).json({
      success: true,
      message: "Bus and related data added successfully",
      data: {
        bus: bus.toJSON(),
        route: route.toJSON(),
        stops: createdStops.map((s) => ({ id: s.id, name: s.name })),
        trips: createdTrips.map((t) => t.toJSON()),
        total_stops: createdStops.length,
        total_trips: createdTrips.length,
      },
    });
  } catch (error) {
    // If something goes wrong, we rollback
    await transaction.rollback();

    console.error("Error adding bus:", error);

    // Handle specific Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }
    // Handle unique constraint violations
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        field: error.errors[0]?.path,
        error: error.errors[0]?.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add bus",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
