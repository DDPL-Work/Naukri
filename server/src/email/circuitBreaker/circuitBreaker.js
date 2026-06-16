const logger = require("../../config/logger");

const STATE = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

class CircuitBreaker {
  constructor(options = {}) {
    this._failureThreshold = options.failureThreshold || 5;
    this._halfOpenMaxAttempts = options.halfOpenMaxAttempts || 1;
    this._recoveryTimeout = options.recoveryTimeout || 60000;
    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._lastFailureTime = null;
    this._halfOpenAttempts = 0;
    this._name = options.name || "email-provider";
  }

  get state() {
    return this._state;
  }

  get failureCount() {
    return this._failureCount;
  }

  get lastFailureTime() {
    return this._lastFailureTime;
  }

  get isOpen() {
    if (this._state === STATE.OPEN) {
      if (this._hasRecoveryTimeElapsed()) {
        logger.info(`[circuitBreaker:${this._name}] Transitioning OPEN -> HALF_OPEN`);
        this._state = STATE.HALF_OPEN;
        this._halfOpenAttempts = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  _hasRecoveryTimeElapsed() {
    if (!this._lastFailureTime) return true;
    return Date.now() - this._lastFailureTime >= this._recoveryTimeout;
  }

  async call(fn) {
    if (this.isOpen) {
      logger.warn(`[circuitBreaker:${this._name}] Circuit is OPEN, rejecting call`);
      throw new Error(
        `Circuit breaker is OPEN for "${this._name}". ` +
        `Failed ${this._failureCount} times. Retry after ${this._recoveryTimeout}ms recovery window.`
      );
    }

    try {
      const result = await fn();

      if (this._state === STATE.HALF_OPEN) {
        this._halfOpenAttempts++;
        if (this._halfOpenAttempts >= this._halfOpenMaxAttempts) {
          logger.info(`[circuitBreaker:${this._name}] Transitioning HALF_OPEN -> CLOSED (success)`);
          this._state = STATE.CLOSED;
          this._failureCount = 0;
          this._lastFailureTime = null;
        }
      } else if (this._state === STATE.CLOSED && this._failureCount > 0) {
        this._failureCount = Math.max(0, this._failureCount - 1);
      }

      return result;
    } catch (error) {
      this._failureCount++;
      this._lastFailureTime = Date.now();

      if (this._state === STATE.HALF_OPEN) {
        logger.warn(`[circuitBreaker:${this._name}] HALF_OPEN attempt failed, returning to OPEN`);
        this._state = STATE.OPEN;
      } else if (this._failureCount >= this._failureThreshold) {
        logger.warn(
          `[circuitBreaker:${this._name}] Failure threshold reached (${this._failureCount}/${this._failureThreshold}), transitioning CLOSED -> OPEN`
        );
        this._state = STATE.OPEN;
      }

      throw error;
    }
  }

  success() {
    if (this._state === STATE.CLOSED) {
      this._failureCount = Math.max(0, this._failureCount - 1);
    }
  }

  failure() {
    this._failureCount++;
    this._lastFailureTime = Date.now();

    if (this._failureCount >= this._failureThreshold) {
      this._state = STATE.OPEN;
    }
  }

  reset() {
    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._lastFailureTime = null;
    this._halfOpenAttempts = 0;
    logger.info(`[circuitBreaker:${this._name}] Reset to CLOSED`);
  }

  getStatus() {
    return {
      name: this._name,
      state: this._state,
      failureCount: this._failureCount,
      failureThreshold: this._failureThreshold,
      lastFailureTime: this._lastFailureTime,
      recoveryTimeout: this._recoveryTimeout,
      isOpen: this._state === STATE.OPEN,
      hasRecoveryElapsed: this._state === STATE.OPEN
        ? this._hasRecoveryTimeElapsed()
        : false,
    };
  }
}

CircuitBreaker.STATE = STATE;

module.exports = CircuitBreaker;
