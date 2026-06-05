const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const errorMiddleware = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const jobRoutes = require("./routes/job.routes");
const qrRoutes = require("./routes/qr.routes");
const crmRoutes = require("./routes/crm.routes");
const crmPanelRoutes = require("./routes/crm-panel.routes");
const leadGeneratorRoutes = require("./routes/lead-generator.routes");
const stateManagerRoutes = require("./routes/state-manager.routes");
const zonalManagerRoutes = require("./routes/zonal-manager.routes");
const fseRoutes = require("./routes/fse.routes");
const landingRoute = require("./routes/landing.routes");
const adminRoutes = require("./routes/admin.routes");
const candidateRoutes = require("./routes/candidate.routes");
const nshRoutes = require("./routes/national-sales-head.routes");
const companyPanelRoutes = require("./routes/company-panel.routes");

const app = express();

// Basic Middlewares
const allowedOrigins = String(process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowLocalFallback =
        process.env.NODE_ENV !== "production" && allowedOrigins.length === 0;

      if (!origin || allowedOrigins.includes(origin) || allowLocalFallback) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

// -----------------------------
// API Versioning
// -----------------------------
const API_VERSION = process.env.APP_VERSION || "1";

// Example: /api/v1/auth
const BASE_ROUTE = `/api/v${API_VERSION}`;

// Routes
app.use(`${BASE_ROUTE}/auth`, authRoutes);
app.use(`${BASE_ROUTE}/company`, companyRoutes);
app.use(`${BASE_ROUTE}/job`, jobRoutes);
app.use(`${BASE_ROUTE}/qr`, qrRoutes);
app.use(`${BASE_ROUTE}/crm`, crmRoutes);
app.use(`${BASE_ROUTE}/crm-panel`, crmPanelRoutes);
app.use(`${BASE_ROUTE}/lead-generator`, leadGeneratorRoutes);
app.use(`${BASE_ROUTE}/state-manager`, stateManagerRoutes);
app.use(`${BASE_ROUTE}/zonal-manager`, zonalManagerRoutes);
app.use(`${BASE_ROUTE}/fse`, fseRoutes);
app.use(`${BASE_ROUTE}/landing`, landingRoute);
app.use(`${BASE_ROUTE}/admin`, adminRoutes);
app.use(`${BASE_ROUTE}/candidate`, candidateRoutes);
app.use(`${BASE_ROUTE}/national-sales-head`, nshRoutes);
app.use(`${BASE_ROUTE}/company-panel`, companyPanelRoutes);

// Health Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: `${process.env.APP_NAME} API Running`,
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  });
});

// Error Handler (must be last)
app.use(errorMiddleware);

module.exports = app;
