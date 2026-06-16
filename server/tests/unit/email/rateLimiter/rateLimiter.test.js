const { RateLimiter, getMaxEmailsPerMinute } = require("../../../../src/email/rateLimiter/rateLimiter");
const EmailDeliveryError = require("../../../../src/email/errors/EmailDeliveryError");

describe("RateLimiter", () => {
  beforeEach(() => {
    delete process.env.EMAIL_RATE_LIMIT_DEVELOPMENT;
    delete process.env.EMAIL_RATE_LIMIT_PRODUCTION;
    delete process.env.NODE_ENV;
  });

  describe("RateLimiter class", () => {
    test("allows consumption within limit", () => {
      const rl = new RateLimiter({ maxPerWindow: 5, windowMs: 60000 });

      expect(rl.tryConsume(1)).toBe(true);
      expect(rl.tryConsume(3)).toBe(true);

      expect(rl.tokensRemaining).toBe(1);
    });

    test("blocks when over limit", () => {
      const rl = new RateLimiter({ maxPerWindow: 2, windowMs: 60000 });

      expect(rl.tryConsume(1)).toBe(true);
      expect(rl.tryConsume(1)).toBe(true);
      expect(rl.tryConsume(1)).toBe(false);
    });

    test("throws on consume when over limit", async () => {
      const rl = new RateLimiter({ maxPerWindow: 1, windowMs: 60000 });

      await rl.consume(1);
      await expect(rl.consume(1)).rejects.toThrow(EmailDeliveryError);
      await expect(rl.consume(1)).rejects.toThrow(/Rate limit exceeded/);
    });

    test("refills after window expires", () => {
      const rl = new RateLimiter({ maxPerWindow: 2, windowMs: 100 });

      expect(rl.tryConsume(2)).toBe(true);
      expect(rl.tryConsume(1)).toBe(false);

      rl._lastRefill = Date.now() - 200;

      expect(rl.tryConsume(1)).toBe(true);
    });

    test("reset restores tokens", () => {
      const rl = new RateLimiter({ maxPerWindow: 3, windowMs: 60000 });

      rl.tryConsume(3);
      expect(rl.tokensRemaining).toBe(0);

      rl.reset();
      expect(rl.tokensRemaining).toBe(3);
    });

    test("getStatus returns diagnostic info", () => {
      const rl = new RateLimiter({ maxPerWindow: 10, windowMs: 60000 });

      rl.tryConsume(3);
      const status = rl.getStatus();

      expect(status).toHaveProperty("maxPerWindow", 10);
      expect(status).toHaveProperty("tokensRemaining", 7);
      expect(status.isLimited).toBe(false);
    });
  });

  describe("getMaxEmailsPerMinute", () => {
    test("returns dev default", () => {
      process.env.NODE_ENV = "development";
      expect(getMaxEmailsPerMinute()).toBe(10);
    });

    test("reads from env in development", () => {
      process.env.NODE_ENV = "development";
      process.env.EMAIL_RATE_LIMIT_DEVELOPMENT = "25";
      expect(getMaxEmailsPerMinute()).toBe(25);
    });

    test("reads from env in production", () => {
      process.env.NODE_ENV = "production";
      expect(getMaxEmailsPerMinute()).toBe(50);

      process.env.EMAIL_RATE_LIMIT_PRODUCTION = "100";
      expect(getMaxEmailsPerMinute()).toBe(100);
    });

    test("returns Infinity for test env", () => {
      process.env.NODE_ENV = "test";
      expect(getMaxEmailsPerMinute()).toBe(Infinity);
    });
  });
});
