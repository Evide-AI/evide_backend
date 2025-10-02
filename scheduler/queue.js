import { Queue } from "bullmq";
import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Queue for adding trip start and end jobs
export const tripQueue = new Queue("trip-scheduling", {
  connection: {
    url: REDIS_URL,
  },
});

/**
 * Schedules the start and end jobs for a given trip.
 * @param {object} trip - The trip object from Sequelize.
 */
export const scheduleTripJobs = async (trip) => {
  const now = new Date();
  const [startHour, startMinute] = trip.scheduled_start_time.split(":");
  const [endHour, endMinute] = trip.scheduled_end_time.split(":");

  const startTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    startHour,
    startMinute,
  );
  const endTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    endHour,
    endMinute,
  );

  // Unique job_id to prevent duplicates
  const start_job_id = `trip-${trip.id}-start`;
  const end_job_id = `trip-${trip.id}-end`;

  const startCron = `${startTime.getMinutes()} ${startTime.getHours()} * * *`;
  const endCron = `${endTime.getMinutes()} ${endTime.getHours()} * * *`;

  // Add jobs to queue
  try {
    console.log(`Adding trip ${trip.id} to queue`);
    await tripQueue.add(
      "trip-job",
      { tripId: trip.id, action: "start" },
      {
        repeat: { cron: startCron, tz: "Asia/Kolkata" },
        jobId: start_job_id,
      },
    );
    await tripQueue.add(
      "trip-job",
      { tripId: trip.id, action: "end" },
      {
        repeat: { cron: endCron, tz: "Asia/Kolkata" },
        jobId: end_job_id,
      },
    );
  } catch (error) {
    console.error("Could not add to Redis", error);
  }
};
