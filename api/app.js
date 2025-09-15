import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sequelize } from "../config/db.js";

import authRoutes from "./routes/authRoutes.js";
import busRoutes from "./routes/busRoutes.js";

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Evide API Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/db", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: "OK",
      database: "Connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      database: "Disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api", (req, res) => {
  res.json({
    message: "Evide Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      database: "/health/db",
      auth: "/api/auth",
      buses: "/api/buses",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: "The requested endpoint does not exist",
    path: req.originalUrl,
  });
});

export default app;
