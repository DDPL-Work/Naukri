const {
  checkSesSandboxStatus,
  inferSandboxFromEnv,
} = require("../../../../src/email/diagnostics/sandbox");

describe("Sandbox Detection", () => {
  describe("checkSesSandboxStatus", () => {
    test("returns sandbox=true when quota is low", async () => {
      const mockProvider = {
        _getClient: jest.fn(() => ({
          send: jest.fn().mockResolvedValue({
            Max24HourSend: 200,
            MaxSendRate: 1,
            SentLast24Hours: 0,
          }),
        })),
      };

      const result = await checkSesSandboxStatus(mockProvider);

      expect(result.sandbox).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details.maxSendRate).toBe(1);
    });

    test("returns sandbox=false when quota is high", async () => {
      const mockProvider = {
        _getClient: jest.fn(() => ({
          send: jest.fn().mockResolvedValue({
            Max24HourSend: 50000,
            MaxSendRate: 14,
            SentLast24Hours: 1000,
          }),
        })),
      };

      const result = await checkSesSandboxStatus(mockProvider);

      expect(result.sandbox).toBe(false);
      expect(result.error).toBeNull();
    });

    test("handles errors gracefully", async () => {
      const mockProvider = {
        _getClient: jest.fn(() => ({
          send: jest.fn().mockRejectedValue(new Error("AccessDenied")),
        })),
      };

      const result = await checkSesSandboxStatus(mockProvider);

      expect(result.sandbox).toBe(true);
      expect(result.error).toBe("AccessDenied");
    });
  });

  describe("inferSandboxFromEnv", () => {
    test("returns null for development", () => {
      process.env.NODE_ENV = "development";
      const result = inferSandboxFromEnv();
      expect(result.sandbox).toBeNull();
    });

    test("returns null for production without check", () => {
      process.env.NODE_ENV = "production";
      const result = inferSandboxFromEnv();
      expect(result.sandbox).toBeNull();
      expect(result.note).toContain("GetSendQuota");
    });
  });
});
