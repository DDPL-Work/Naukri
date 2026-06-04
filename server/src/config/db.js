const mongoose = require("mongoose");

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 3000;
const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 10000;
const DEFAULT_SOCKET_TIMEOUT_MS = 45000;

let listenersBound = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getConnectionOptions = () => ({
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
  ),
  socketTimeoutMS: parsePositiveInt(
    process.env.MONGO_SOCKET_TIMEOUT_MS,
    DEFAULT_SOCKET_TIMEOUT_MS,
  ),
  family: process.env.MONGO_IP_FAMILY === "4" ? 4 : undefined,
});

const getPrimaryErrorCode = (error) =>
  error?.cause?.code || error?.code || error?.name || "UNKNOWN";

const bindConnectionListeners = () => {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  mongoose.connection.on("connected", () => {
    console.log(`[db] MongoDB connected to ${mongoose.connection.host}`);
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[db] MongoDB connection re-established.");
  });

  mongoose.connection.on("disconnected", () => {
    if (mongoose.connection.readyState === 0) {
      console.warn("[db] MongoDB connection disconnected.");
      return;
    }

    console.warn("[db] MongoDB driver reported a transient disconnect; waiting for reconnection.");
  });

  mongoose.connection.on("error", (error) => {
    console.error(
      `[db] MongoDB connection error (${getPrimaryErrorCode(error)}): ${error.message}`,
    );
  });
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGO_URI in server environment.");
  }

  bindConnectionListeners();

  const maxRetries = parsePositiveInt(
    process.env.MONGO_CONNECT_MAX_RETRIES,
    DEFAULT_MAX_RETRIES,
  );
  const retryDelayMs = parsePositiveInt(
    process.env.MONGO_CONNECT_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS,
  );

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const connection = await mongoose.connect(mongoUri, getConnectionOptions());
      return connection;
    } catch (error) {
      lastError = error;
      const errorCode = getPrimaryErrorCode(error);
      const isLastAttempt = attempt === maxRetries;

      console.error(
        `[db] MongoDB connection attempt ${attempt}/${maxRetries} failed (${errorCode}): ${error.message}`,
      );

      if (isLastAttempt) {
        break;
      }

      console.log(`[db] Retrying MongoDB connection in ${retryDelayMs}ms...`);
      await wait(retryDelayMs);
    }
  }

  throw lastError;
};

module.exports = connectDB;
