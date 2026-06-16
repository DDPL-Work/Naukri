const logger = require("../../config/logger");
const EmailDeliveryError = require("../errors/EmailDeliveryError");

const RATE_LIMIT_WINDOW_MS = 60000;

function getMaxEmailsPerMinute() {
  const env = (process.env.NODE_ENV || "development").toLowerCase();

  if (env === "production") {
    const val = parseInt(process.env.EMAIL_RATE_LIMIT_PRODUCTION || "50", 10);
    return val > 0 ? val : 50;
  }

  if (env === "test") {
    return Infinity;
  }

  const val = parseInt(process.env.EMAIL_RATE_LIMIT_DEVELOPMENT || "10", 10);
  return val > 0 ? val : 10;
}

class RateLimiter {
  constructor(options = {}) {
    this._maxPerWindow = options.maxPerWindow || getMaxEmailsPerMinute();
    this._windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;
    this._tokens = this._maxPerWindow;
    this._lastRefill = Date.now();
    this._name = options.name || "email-rate-limiter";
  }

  get maxPerWindow() {
    return this._maxPerWindow;
  }

  get tokensRemaining() {
    this._refill();
    return this._tokens;
  }

  get windowMs() {
    return this._windowMs;
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this._lastRefill;

    if (elapsed >= this._windowMs) {
      this._tokens = this._maxPerWindow;
      this._lastRefill = now;
    }
  }

  tryConsume(count = 1) {
    this._refill();

    if (this._tokens >= count) {
      this._tokens -= count;
      return true;
    }

    return false;
  }

  async consume(count = 1) {
    if (!this.tryConsume(count)) {
      logger.warn(`[rateLimiter:${this._name}] Rate limit exceeded`, {
        maxPerWindow: this._maxPerWindow,
        windowMs: this._windowMs,
      });

      throw new EmailDeliveryError(
        `Rate limit exceeded: maximum ${this._maxPerWindow} emails per ${this._windowMs / 1000}s`,
        { code: EmailDeliveryError.CODES.THROTTLING_ERROR }
      );
    }
  }

  reset() {
    this._tokens = this._maxPerWindow;
    this._lastRefill = Date.now();
  }

  getStatus() {
    return {
      name: this._name,
      maxPerWindow: this._maxPerWindow,
      windowMs: this._windowMs,
      tokensRemaining: this.tokensRemaining,
      isLimited: this._tokens <= 0,
    };
  }
}

module.exports = { RateLimiter, getMaxEmailsPerMinute };
