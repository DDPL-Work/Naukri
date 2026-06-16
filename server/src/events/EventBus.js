const logger = require("../config/logger");

class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers || handlers.length === 0) {
      logger.debug(`[EventBus] No handlers for event: ${event}`);
      return;
    }
    for (const handler of handlers) {
      try {
        const result = handler(payload);
        if (result && typeof result.catch === "function") {
          result.catch((err) => {
            logger.error(`[EventBus] Async handler error for ${event}: ${err.message}`, {
              event,
              error: err.message,
            });
          });
        }
      } catch (err) {
        logger.error(`[EventBus] Handler error for ${event}: ${err.message}`, {
          event,
          error: err.message,
        });
      }
    }
  }

  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  listenerCount(event) {
    const handlers = this._listeners.get(event);
    return handlers ? handlers.length : 0;
  }
}

const bus = new EventBus();
bus.EventBus = EventBus;

module.exports = bus;
