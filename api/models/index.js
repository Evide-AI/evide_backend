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

// A route has many RouteStops
Route.hasMany(RouteStop, { foreignKey: "route_id" });
RouteStop.belongsTo(Route, { foreignKey: "route_id" });

// A stop has many RouteStops
Stop.hasMany(RouteStop, { foreignKey: "stop_id" });
RouteStop.belongsTo(Stop, { foreignKey: "stop_id" });

// A Route has many Trips
Route.hasMany(Trip, { foreignKey: 'route_id' })
Trip.belongsTo(Route, { foreignKey: 'route_id' })

// A Trip has many TripStopTimes
Trip.hasMany(TripStopTime, { foreignKey: 'trip_id' })
TripStopTime.belongsTo(Trip, { foreignKey: 'trip_id' })

// A Stop is associated with many TripStopTimes
Stop.hasMany(TripStopTime, { foreignKey: 'stop_id' })
TripStopTime.belongsTo(Stop, { foreignKey: 'stop_id' })

export { Bus, Route, RouteStop, Stop, Trip, TripStopTime, User };
