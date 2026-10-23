/**
 * CareOps AI - Express Application Setup
 * 
 * Configures middleware, security, and route mounts.
 * Exported separately from server.js to facilitate isolated integration testing.
 */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorMiddleware");

const app = express();

// 0. Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[HTTP ${new Date().toLocaleTimeString()}] ${req.method} ${req.url} (Origin: ${req.headers.origin || "none"})`);
  next();
});

// 1. Cross-Origin Resource Sharing (CORS)
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Blocked by CORS policy"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  })
);

// 2. Body Parsing Middleware
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 3. Database Health Check Endpoint
app.get(["/api/health", "/api/v1/health"], (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? "OK" : "ERROR",
    database: isConnected ? "CONNECTED" : "DISCONNECTED",
  });
});

// 4. Mount Feature Routes
app.use(["/api/v1/auth", "/api/auth"], authRoutes);
app.use(["/api/v1/users", "/api/users"], require("./users/user.routes"));
app.use(["/api/v1/patients", "/api/patients"], require("./patients/patient.routes"));
app.use(["/api/v1/doctors", "/api/doctors"], require("./doctors/doctor.routes"));
app.use(["/api/v1/appointments", "/api/appointments"], require("./appointments/appointment.routes"));
app.use(["/api/v1/tasks", "/api/tasks"], require("./tasks/task.routes"));
app.use(["/api/v1/insurance", "/api/insurance"], require("./insurance/insurance.routes"));
app.use(["/api/v1/departments", "/api/departments"], require("./departments/department.routes"));
app.use(["/api/v1/admin", "/api/admin"], require("./admin/admin.routes"));
app.use(["/api/v1/analytics", "/api/analytics"], require("./analytics/analytics.routes"));

// 5. Fallback & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
