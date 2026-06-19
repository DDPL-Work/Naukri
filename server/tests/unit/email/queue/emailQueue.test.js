jest.mock("bullmq", () => null, { virtual: true });

const EmailQueue = require("../../../../src/email/queue/emailQueue");

describe("EmailQueue", () => {
  beforeEach(() => {
    delete process.env.EMAIL_QUEUE_ENABLED;
    delete process.env.EMAIL_QUEUE_NAME;
    delete process.env.REDIS_URL;
  });

  describe("when disabled", () => {
    test("enabled returns false by default", () => {
      const queue = new EmailQueue();
      expect(queue.enabled).toBe(false);
    });

    test("add returns immediate=true", async () => {
      const queue = new EmailQueue({ enabled: false });
      const result = await queue.add({ to: "test@example.com" });

      expect(result).toEqual({ immediate: true, result: null });
    });

    test("getQueueDepth returns 0", async () => {
      const queue = new EmailQueue({ enabled: false });
      expect(await queue.getQueueDepth()).toBe(0);
    });

    test("close is safe", async () => {
      const queue = new EmailQueue({ enabled: false });
      await expect(queue.close()).resolves.not.toThrow();
    });
  });

  describe("when enabled", () => {
    test("falls back to immediate if bullmq not installed", async () => {
      const queue = new EmailQueue({ enabled: true });
      await queue.initialize();

      expect(queue.enabled).toBe(false);
    });

    test("has correct name", () => {
      const queue = new EmailQueue({ name: "custom-queue" });
      expect(queue.name).toBe("custom-queue");
    });

    test("uses default name", () => {
      process.env.EMAIL_QUEUE_NAME = "test-queue";
      const queue = new EmailQueue();
      expect(queue.name).toBe("test-queue");
    });
  });

  describe("close", () => {
    test("closes uninitialized queue safely", async () => {
      const queue = new EmailQueue({ enabled: true });
      await queue.close();
      expect(queue._initialized).toBe(false);
    });
  });

  describe("obliterate", () => {
    test("handles obliterate on uninitialized queue", async () => {
      const queue = new EmailQueue({ enabled: true });
      await expect(queue.obliterate()).resolves.not.toThrow();
    });
  });
});
