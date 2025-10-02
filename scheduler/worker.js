import { Worker } from "bullmq";
import { createClient } from "redis";
import "dotenv/config";
import { connectDB } from "../config/db.js";
import Trip from "../api/models/Trip.js";
import Bus from "../api/models/Bus.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const ACTIVE_BUSES_KEY = "active_buses";

const redisClient = createClient({ url: REDIS_URL });

export const startWorker = async () => {
  await connectDB();
  await redisClient.connect();

  // Worker to process jobs from trip-scheduling queue
  // Add active buses to Redis with busInfo
  // And vice versa
  new Worker(
    "trip-scheduling",
    async (job) => {
      const { trip_id, action } = job.data;

      const trip = await Trip.findByPk(trip_id, {
        include: [
          { model: Bus, attributes: ["id", "bus_number", "imei_number"] },
        ],
      });

      if (!trip || !trip.bus) {
        console.warn(
          `Trip ${trip_id} or its associated bus not found, skipping job.`,
        );
        return;
      }

      const busInfo = {
        bus_id: trip.bus.id,
        bus_number: trip.bus.bus_number,
        imei_number: trip.bus.imei_number,
        trip_id: trip.id,
        route_id: trip.route_id,
      };

      if (action === "start") {
        // Add to active_buses
        await redisClient.hSet(
          ACTIVE_BUSES_KEY,
          trip.bus_id.toString(),
          JSON.stringify(busInfo),
        );
      } else if (action === "end") {
        // Remove from active_buses
        await redisClient.hDel(ACTIVE_BUSES_KEY, trip.bus_id.toString());
      }
    },
    {
      connection: {
        url: REDIS_URL,
      },
    },
  );
};
