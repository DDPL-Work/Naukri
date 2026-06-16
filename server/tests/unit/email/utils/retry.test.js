const { withRetry, isTransientError, calculateBackoff } = require("../../../../src/email/utils/retry");

describe("retry utilities", () => {
  describe("isTransientError", () => {
    test("returns true for throttling errors", () => {
      expect(isTransientError({ code: "ThrottlingException" })).toBe(true);
      expect(isTransientError({ name: "Throttling" })).toBe(true);
      expect(isTransientError({ code: "TooManyRequestsException" })).toBe(true);
    });

    test("returns true for service errors", () => {
      expect(isTransientError({ code: "ServiceUnavailable" })).toBe(true);
      expect(isTransientError({ name: "InternalFailure" })).toBe(true);
      expect(isTransientError({ code: "ServiceUnavailableException" })).toBe(true);
    });

    test("returns true for network errors", () => {
      expect(isTransientError({ code: "ECONNRESET" })).toBe(true);
      expect(isTransientError({ code: "ETIMEDOUT" })).toBe(true);
      expect(isTransientError({ code: "NetworkingError" })).toBe(true);
    });

    test("returns true for 5xx HTTP status", () => {
      expect(isTransientError({ $metadata: { httpStatusCode: 500 } })).toBe(true);
      expect(isTransientError({ $metadata: { httpStatusCode: 503 } })).toBe(true);
    });

    test("returns false for permanent errors", () => {
      expect(isTransientError({ code: "MessageRejected" })).toBe(false);
      expect(isTransientError({ code: "InvalidParameterValue" })).toBe(false);
      expect(isTransientError({ name: "ValidationError" })).toBe(false);
    });

    test("returns false for null/undefined", () => {
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });
  });

  describe("calculateBackoff", () => {
    test("returns base delay for first attempt", () => {
      expect(calculateBackoff(1, 1000, 30000)).toBeGreaterThanOrEqual(1000);
      expect(calculateBackoff(1, 1000, 30000)).toBeLessThan(1100);
    });

    test("doubles for second attempt", () => {
      const delay = calculateBackoff(2, 1000, 30000);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThan(2200);
    });

    test("quadruples for third attempt", () => {
      const delay = calculateBackoff(3, 1000, 30000);
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThan(4400);
    });

    test("caps at maxDelay", () => {
      const delay = calculateBackoff(10, 1000, 30000);
      expect(delay).toBeLessThanOrEqual(33000);
    });
  });

  describe("withRetry", () => {
    test("succeeds on first attempt", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const result = await withRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("retries and succeeds", async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({ code: "ETIMEDOUT", message: "timeout" })
        .mockResolvedValueOnce("success");

      const result = await withRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test("fails after exhausting retries", async () => {
      const error = { code: "ServiceUnavailable", message: "down" };
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxAttempts: 2 })).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test("does not retry non-transient errors", async () => {
      const error = { code: "InvalidInput", message: "bad request" };
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn)).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("passes attempt number to fn", async () => {
      const fn = jest.fn().mockResolvedValue("ok");

      await withRetry(fn);

      expect(fn).toHaveBeenCalledWith(1);
    });
  });
});
