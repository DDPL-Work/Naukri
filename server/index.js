const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");

const envResult = dotenv.config();
if (envResult.parsed) {
  dotenvExpand.expand(envResult);
}

const http = require("http");
const mongoose = require("mongoose");
const expressTimeoutHandler = require("express-timeout-handler");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initChatSocket } = require("./src/realtime/chat.socket");
const logger = require("./src/config/logger");

const APP_NAME = process.env.APP_NAME || "Application";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = parseInt(process.env.PORT || "5050", 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10);

app.use(expressTimeoutHandler.set(REQUEST_TIMEOUT_MS));
app.use(expressTimeoutHandler.handler({
  timeout: REQUEST_TIMEOUT_MS,
  onTimeout: (req, res, next) => {
    logger.warn("Request timeout", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });

    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: "Request timed out. Please try again.",
      });
    }
  },
}));

app.use((req, res, next) => {
  res.setTimeout(
    parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10),
    () => {
      logger.warn("Response timeout", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });
    },
  );
  next();
});

const startServer = (desiredPort) => {
  const server = http.createServer(app);
  initChatSocket(server);

  const attemptListen = (port) => {
    server.listen(port, () => {
      const mongooseState = mongoose.connection.readyState;

      console.log("\n==================================================");
      console.log(`${APP_NAME} Started Successfully`);
      console.log("==================================================");
      console.log(`Version       : v${APP_VERSION}`);
      console.log(`Environment   : ${NODE_ENV}`);
      console.log(`Port          : ${server.address().port}`);
      console.log(
        `Database Host : ${mongoose.connection.host || "connecting..."}`,
      );
      console.log(
        `Database      : ${mongooseState === 1 ? "Connected Successfully" : "Connecting..."}`,
      );
      console.log(`Base URL      : ${BASE_URL.replace(/:5\d{3}/, `:${server.address().port}`)}`);
      console.log(`API Base      : ${BASE_URL.replace(/:5\d{3}/, `:${server.address().port}`)}/api/v${APP_VERSION}`);
      console.log("==================================================\n");
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.warn(`Port ${port} is in use, attempting next port...`);
        server.close();
        attemptListen(port + 1);
      } else {
        logger.error("Server error", { error });
        process.exit(1);
      }
    });
  };

  attemptListen(desiredPort);

  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Rejection", { error: err.message });
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", { error: err.message });
    process.exit(1);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received. Shutting down gracefully...");
    server.close(() => {
      mongoose.disconnect().then(() => {
        logger.info("MongoDB connection closed.");
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.warn("Forcing shutdown after timeout...");
      process.exit(1);
    }, 10000);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      mongoose.disconnect().then(() => {
        logger.info("MongoDB connection closed.");
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.warn("Forcing shutdown after timeout...");
      process.exit(1);
    }, 10000);
  });
};

const shutdown = async (signal, error = null) => {
  if (error) {
    console.error(`[server] ${signal}:`, error);
    logger.error(signal, { error: error.message, stack: error.stack });
  } else {
    console.log(`[server] ${signal} received. Shutting down...`);
    logger.info(`${signal} received`);
  }
  process.exit(error ? 1 : 0);
};

process.on("exit", (code) => {
  logger.info(`Process exiting with code: ${code}`);
});

connectDB()
  .then(() => {
    startServer(PORT);
  })
  .catch((error) => {
    console.error("[server] Failed to connect to database:", error);
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  });
