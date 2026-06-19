const logger = require("../../config/logger");

const locks = new Map();

async function acquireLock(name, ttlMs = 60000) {
  const now = Date.now();
  const existing = locks.get(name);

  if (existing && existing.expiresAt > now) {
    logger.warn(`[lock] Unable to acquire lock "${name}": already held`, {
      lock: name,
      acquiredAt: new Date(existing.acquiredAt).toISOString(),
      expiresAt: new Date(existing.expiresAt).toISOString(),
    });
    return false;
  }

  locks.set(name, {
    acquiredAt: now,
    expiresAt: now + ttlMs,
  });

  logger.info(`[lock] Acquired lock "${name}"`, {
    lock: name,
    ttlMs,
    expiresAt: new Date(now + ttlMs).toISOString(),
  });

  return true;
}

async function releaseLock(name) {
  const existed = locks.has(name);
  locks.delete(name);

  if (existed) {
    logger.info(`[lock] Released lock "${name}"`);
  }

  return existed;
}

function isLocked(name) {
  const existing = locks.get(name);
  if (!existing) return false;
  if (existing.expiresAt <= Date.now()) {
    locks.delete(name);
    return false;
  }
  return true;
}

function clearAllLocks() {
  locks.clear();
  logger.info("[lock] All locks cleared");
}

module.exports = { acquireLock, releaseLock, isLocked, clearAllLocks };
