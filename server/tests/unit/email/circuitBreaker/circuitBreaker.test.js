const CircuitBreaker = require("../../../../src/email/circuitBreaker/circuitBreaker");

describe("CircuitBreaker", () => {
  let cb;

  beforeEach(() => {
    cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 100,
      halfOpenMaxAttempts: 1,
      name: "test",
    });
  });

  test("starts closed", () => {
    expect(cb.state).toBe("CLOSED");
    expect(cb.isOpen).toBe(false);
  });

  test("opens after threshold failures", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow("fail");
    }

    expect(cb.state).toBe("OPEN");
    expect(cb.failureCount).toBe(3);
  });

  test("rejects calls when open", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow("fail");
    }

    await expect(cb.call(jest.fn().mockResolvedValue("ok"))).rejects.toThrow(
      "Circuit breaker is OPEN"
    );
  });

  test("transitions to half-open after recovery timeout", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow("fail");
    }

    expect(cb.state).toBe("OPEN");

    await new Promise((r) => setTimeout(r, 150));

    const successFn = jest.fn().mockResolvedValue("ok");
    const result = await cb.call(successFn);
    expect(result).toBe("ok");
    expect(cb.state).toBe("CLOSED");
  });

  test("returns to open on failure in half-open", async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow("fail");
    }

    await new Promise((r) => setTimeout(r, 150));

    const stillFailing = jest.fn().mockRejectedValue(new Error("still fail"));
    await expect(cb.call(stillFailing)).rejects.toThrow("still fail");

    expect(cb.state).toBe("OPEN");
  });

  test("success decrements failure count in closed state", () => {
    cb.failure();
    cb.failure();
    expect(cb.failureCount).toBe(2);

    cb.success();
    expect(cb.failureCount).toBe(1);

    cb.success();
    expect(cb.failureCount).toBe(0);
  });

  test("reset restores closed state", () => {
    cb.failure();
    cb.failure();
    cb.failure();

    expect(cb.state).toBe("OPEN");

    cb.reset();

    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
    expect(cb.lastFailureTime).toBeNull();
  });

  test("getStatus returns diagnostic info", () => {
    const status = cb.getStatus();

    expect(status).toHaveProperty("name", "test");
    expect(status).toHaveProperty("state", "CLOSED");
    expect(status).toHaveProperty("failureCount", 0);
    expect(status).toHaveProperty("failureThreshold", 3);
    expect(status).toHaveProperty("isOpen", false);
  });

  test("uses default options", () => {
    const defaultCb = new CircuitBreaker();
    expect(defaultCb._failureThreshold).toBe(5);
    expect(defaultCb._recoveryTimeout).toBe(60000);
  });
});
