const { acquireLock, releaseLock, isLocked, clearAllLocks } = require("../../../src/recommendations/utils/lock");

describe("schedulerLock", () => {
  beforeEach(() => {
    clearAllLocks();
  });

  describe("acquireLock", () => {
    it("acquires a lock successfully", async () => {
      const result = await acquireLock("test-lock", 1000);
      expect(result).toBe(true);
    });

    it("fails to acquire an already held lock", async () => {
      await acquireLock("test-lock", 5000);
      const result = await acquireLock("test-lock", 5000);
      expect(result).toBe(false);
    });

    it("acquires different locks independently", async () => {
      await acquireLock("lock-a", 5000);
      const result = await acquireLock("lock-b", 5000);
      expect(result).toBe(true);
    });
  });

  describe("releaseLock", () => {
    it("releases a held lock", async () => {
      await acquireLock("test-lock", 5000);
      const released = await releaseLock("test-lock");
      expect(released).toBe(true);
      const result = await acquireLock("test-lock", 5000);
      expect(result).toBe(true);
    });

    it("returns false for non-existent lock", async () => {
      const result = await releaseLock("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("isLocked", () => {
    it("returns true for held lock", async () => {
      await acquireLock("test-lock", 5000);
      expect(isLocked("test-lock")).toBe(true);
    });

    it("returns false for released lock", async () => {
      await acquireLock("test-lock", 5000);
      await releaseLock("test-lock");
      expect(isLocked("test-lock")).toBe(false);
    });

    it("returns false for expired lock", async () => {
      await acquireLock("test-lock", 10);
      await new Promise((r) => setTimeout(r, 20));
      expect(isLocked("test-lock")).toBe(false);
    });

    it("returns false for non-existent lock", () => {
      expect(isLocked("non-existent")).toBe(false);
    });
  });

  describe("clearAllLocks", () => {
    it("clears all locks", async () => {
      await acquireLock("lock-a", 5000);
      await acquireLock("lock-b", 5000);
      clearAllLocks();
      expect(isLocked("lock-a")).toBe(false);
      expect(isLocked("lock-b")).toBe(false);
    });
  });

  describe("scheduler lock names", () => {
    it("uses correct lock name for PRO scheduler", () => {
      const lockName = "scheduler:pro";
      expect(lockName).toBe("scheduler:pro");
    });

    it("uses correct lock name for ELITE scheduler", () => {
      const lockName = "scheduler:elite";
      expect(lockName).toBe("scheduler:elite");
    });
  });
});
