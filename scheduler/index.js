import "dotenv/config";
import { startWorker } from "./worker.js";
import { tripQueue } from "./queue.js";
import { Op } from "sequelize";
import Trip from "../api/models/Trip.js";
import { scheduleTripJobs } from "./queue.js";

// Start the primary worker to process jobs
startWorker();

// (Optional) Polling Janitor: This job runs periodically to ensure no trips were missed.
const startJanitor = async () => {
  await tripQueue.add(
    "janitor-job",
    {},
    {
      repeat: {
        every: 60 * 60 * 1000, // Every hour
      },
      jobId: "janitor-job",
    },
  );
};

const runJanitor = async () => {
  const now = new Date();

  // Find active trips that should have already been scheduled
  const missedTrips = await Trip.findAll({
    where: {
      scheduled_start_time: { [Op.gt]: now },
      is_active: true,
    },
  });

  for (const trip of missedTrips) {
    const startJob = await tripQueue.getJob(`trip-${trip.id}-start`);
    if (!startJob) {
      console.log(`Janitor found missed trip ${trip.id}, scheduling now.`);
      await scheduleTripJobs(trip);
    }
  }
};

// (Optional) Start a separate worker process for the janitor job.
import { Worker } from "bullmq";
new Worker("trip-scheduling", runJanitor, {
  connection: { url: process.env.REDIS_URL },
  name: "janitor-worker",
});

startJanitor();
