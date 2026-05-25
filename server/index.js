require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initChatSocket } = require("./src/realtime/chat.socket");

const APP_NAME = process.env.APP_NAME || "Application";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(helmet());

if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});

app.use(limiter);

const startServer = async () => {
  let server;

  const closeMongoConnection = async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("[server] MongoDB connection closed.");
    }
  };

  const shutdown = (signal, error = null) => {
    if (error) {
      console.error(`[server] ${signal}:`, error);
    } else {
      console.log(`[server] ${signal} received. Shutting down gracefully...`);
    }

    const exitCode = error ? 1 : 0;

    if (!server) {
      closeMongoConnection()
        .catch((closeError) => {
          console.error("[server] Error while closing MongoDB connection:", closeError);
        })
        .finally(() => process.exit(exitCode));
      return;
    }

    server.close(async () => {
      try {
        await closeMongoConnection();
      } catch (closeError) {
        console.error("[server] Error while closing MongoDB connection:", closeError);
      } finally {
        process.exit(exitCode);
      }
    });
  };

  try {
    const dbConnection = await connectDB();

    server = http.createServer(app);
    initChatSocket(server);

    server.listen(PORT, () => {
      console.log("\n==================================================");
      console.log(`${APP_NAME} Started Successfully`);
      console.log("==================================================");
      console.log(`Version       : v${APP_VERSION}`);
      console.log(`Environment   : ${NODE_ENV}`);
      console.log(`Database Host : ${dbConnection.connection.host}`);
      console.log("Database      : Connected Successfully");
      console.log(`Base URL      : ${BASE_URL}`);
      console.log(`API Base      : ${BASE_URL}/api/v${APP_VERSION}`);
      console.log("==================================================\n");
    });

    process.on("unhandledRejection", (err) => {
      shutdown("Unhandled Rejection", err);
    });

    process.on("uncaughtException", (err) => {
      shutdown("Uncaught Exception", err);
    });

    process.on("SIGINT", () => {
      shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("[server] Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
