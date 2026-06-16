const logger = require("../../config/logger");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateBackoff = (attempt, baseDelay, maxDelay) => {
  const exponential = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = Math.random() * exponential * 0.1;
  return Math.floor(exponential + jitter);
};

const isTransientError = (error) => {
  if (!error) return false;

  const transientCodes = [
    "Throttling",
    "ThrottlingException",
    "RequestThrottled",
    "TooManyRequestsException",
    "ServiceUnavailable",
    "ServiceUnavailableException",
    "InternalFailure",
    "InternalServerError",
    "RequestTimeout",
    "NetworkingError",
    "TimeoutError",
    "ECONNRESET",
    "ETIMEDOUT",
    "ESOCKET",
  ];

  const code = error.code || error.name || "";

  if (transientCodes.some((tc) => code.includes(tc))) return true;

  if (error.$metadata && error.$metadata.httpStatusCode >= 500) return true;

  return false;
};

async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    operation = "email send",
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      if (attempt > 1) {
        logger.info(`[retry] ${operation} succeeded on attempt ${attempt}/${maxAttempts}`);
      }
      return result;
    } catch (error) {
      lastError = error;

      const isTransient = isTransientError(error);

      if (attempt < maxAttempts && isTransient) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay);
        logger.warn(`[retry] ${operation} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, {
          attempt,
          maxAttempts,
          delay,
          error: error.message,
          transient: true,
        });

        if (typeof onRetry === "function") {
          onRetry({ attempt, maxAttempts, delay, error, transient: true });
        }

        await sleep(delay);
      } else if (attempt < maxAttempts && !isTransient) {
        logger.warn(`[retry] ${operation} failed with non-transient error (attempt ${attempt}/${maxAttempts}), not retrying`, {
          attempt,
          maxAttempts,
          error: error.message,
          code: error.code || error.name,
        });

        if (typeof onRetry === "function") {
          onRetry({ attempt, maxAttempts, error, transient: false });
        }

        throw error;
      } else {
        logger.error(`[retry] ${operation} exhausted all ${maxAttempts} attempts`, {
          attempts: maxAttempts,
          error: error.message,
        });

        if (typeof onRetry === "function") {
          onRetry({ attempt, maxAttempts, error, transient: isTransient, exhausted: true });
        }
      }
    }
  }

  throw lastError;
}

module.exports = { withRetry, isTransientError, calculateBackoff, sleep };
