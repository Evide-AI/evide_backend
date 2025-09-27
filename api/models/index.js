import Bus from "./Bus.js";
import Route from "./Route.js";
import RouteStop from "./RouteStop.js";
import Stop from "./Stop.js";
import Trip from "./Trip.js";
import TripStopTime from "./TripStopTime.js";
import User from "./User.js";

/**
 * Defines the associations between the models in the application.
 * These associations are crucial for establishing the relationships between different data entities,
 * enabling Sequelize to perform efficient joins and data retrieval operations.
 * like the get operation with route_id which includes route_stops and stops
 */

// Establishes a one-to-many relationship between Route and RouteStop.
// This is necessary to link a route to its sequence of stops.
Route.hasMany(RouteStop, { foreignKey: "route_id" });
RouteStop.belongsTo(Route, { foreignKey: "route_id" });

// Establishes a one-to-many relationship between Stop and RouteStop.
// This allows a stop to be part of multiple routes and defines its role within each route.
Stop.hasMany(RouteStop, { foreignKey: "stop_id" });
RouteStop.belongsTo(Stop, { foreignKey: "stop_id" });

export { Bus, Route, RouteStop, Stop, Trip, TripStopTime, User };
