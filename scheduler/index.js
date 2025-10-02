import "dotenv/config";
import { startWorker } from "./worker.js";

// Start the primary worker to process jobs
startWorker();
