const winston = require("winston");
const path = require("path");
const fs = require("fs");

const NODE_ENV = process.env.NODE_ENV || "development";
const APP_NAME = process.env.APP_NAME || "Application";

const logDir = process.env.LOG_DIR || path.join(__dirname, "../../logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
    let log = `${timestamp} [${label}] ${level}: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  }),
);

const logger = winston.createLogger({
  level: NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { label: APP_NAME },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat,
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
  ],
});

if (NODE_ENV === "production") {
  logger.remove(logger.transports[0]);
}

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
