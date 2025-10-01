import Bus from "./Bus.js";
import Route from "./Route.js";
import BusRoute from "./BusRoute.js";
import RouteStop from "./RouteStop.js";
import Stop from "./Stop.js";
import Trip from "./Trip.js";
import TripStopTime from "./TripStopTime.js";
import User from "./User.js";

/**

 * Relationship Structure:
 * - Bus ↔ BusRoute ↔ Route (Many-to-Many via BusRoute junction table)
 * - Route ↔ RouteStop ↔ Stop (Route connects to Stops with sequence)
 * - Bus ↔ Trip (Bus operates on Trips)
 * - Route ↔ Trip (Trip follows a Route)
 * - Trip ↔ TripStopTime ↔ Stop (Trip timing at each Stop)
 */

// ===== Bus-Route Junction (Many-to-Many) =====
// A bus can operate on multiple routes, a route can be served by multiple buses
Bus.hasMany(BusRoute, { foreignKey: "bus_id", as: "bus_routes" });
BusRoute.belongsTo(Bus, { foreignKey: "bus_id" });

Route.hasMany(BusRoute, { foreignKey: "route_id", as: "bus_routes" });
BusRoute.belongsTo(Route, { foreignKey: "route_id" });

// Alternative: Many-to-Many through association (optional, for convenience)
Bus.belongsToMany(Route, {
  through: BusRoute,
  foreignKey: "bus_id",
  otherKey: "route_id",
  as: "routes",
});
Route.belongsToMany(Bus, {
  through: BusRoute,
  foreignKey: "route_id",
  otherKey: "bus_id",
  as: "buses",
});

// ===== Route-Stop Junction (Many-to-Many with Sequence) =====
// A route has many stops in sequence, a stop can belong to many routes
Route.hasMany(RouteStop, { foreignKey: "route_id", as: "route_stops" });
RouteStop.belongsTo(Route, { foreignKey: "route_id" });

Stop.hasMany(RouteStop, { foreignKey: "stop_id", as: "route_stops" });
RouteStop.belongsTo(Stop, { foreignKey: "stop_id" });

// Alternative: Many-to-Many through association (optional)
Route.belongsToMany(Stop, {
  through: RouteStop,
  foreignKey: "route_id",
  otherKey: "stop_id",
  as: "stops",
});
Stop.belongsToMany(Route, {
  through: RouteStop,
  foreignKey: "stop_id",
  otherKey: "route_id",
  as: "routes",
});

// ===== Trip Associations =====
// A route has many trips, a trip belongs to one route
Route.hasMany(Trip, { foreignKey: "route_id", as: "trips" });
Trip.belongsTo(Route, { foreignKey: "route_id" });

// A bus has many trips, a trip is operated by one bus
Bus.hasMany(Trip, { foreignKey: "bus_id", as: "trips" });
Trip.belongsTo(Bus, { foreignKey: "bus_id" });

// ===== Trip-Stop Timing Junction =====
// A trip has many stop times, a stop time belongs to one trip
Trip.hasMany(TripStopTime, { foreignKey: "trip_id", as: "trip_stop_times" });
TripStopTime.belongsTo(Trip, { foreignKey: "trip_id" });

// A stop has many trip stop times, a trip stop time belongs to one stop
Stop.hasMany(TripStopTime, { foreignKey: "stop_id", as: "trip_stop_times" });
TripStopTime.belongsTo(Stop, { foreignKey: "stop_id" });

// Alternative: Many-to-Many through association (optional)
Trip.belongsToMany(Stop, {
  through: TripStopTime,
  foreignKey: "trip_id",
  otherKey: "stop_id",
  as: "stops",
});
Stop.belongsToMany(Trip, {
  through: TripStopTime,
  foreignKey: "stop_id",
  otherKey: "trip_id",
  as: "trips",
});

export { Bus, Route, BusRoute, RouteStop, Stop, Trip, TripStopTime, User };
