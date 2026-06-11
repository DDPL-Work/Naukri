const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

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

const allowedOrigins = String(process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

const corsOptions = {
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
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const referrer = req.get("referrer") || req.get("referer") || "direct";

  console.log(
    `REQUEST ${timestamp} [${ip}] ${req.method} ${req.originalUrl} ${referrer}`,
  );

  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

const API_VERSION = process.env.APP_VERSION || "1";
const BASE_ROUTE = `/api/v${API_VERSION}`;

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

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: `${process.env.APP_NAME} API Running`,
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

module.exports = app;
