import { resolve } from "path";

export default {
  config: resolve("config", "database.js"),
  "models-path": resolve("api", "models"),
  "migrations-path": resolve("migrations"),
  "seeders-path": resolve("seeders"),
};
