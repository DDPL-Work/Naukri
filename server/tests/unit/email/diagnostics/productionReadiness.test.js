const {
  checkSesProductionReadiness,
  validateEnvSetup,
} = require("../../../../src/email/diagnostics/productionReadiness");

describe("Production Readiness", () => {
  describe("checkSesProductionReadiness", () => {
    function createMockProvider(results) {
      return {
        _config: { from: "sender@example.com", region: "ap-south-1" },
        _getClient: jest.fn(() => ({
          send: jest.fn((command) => {
            const cmdName = command.constructor.name;

            if (results[cmdName]) {
              return results[cmdName];
            }

            if (cmdName === "GetIdentityVerificationAttributesCommand") {
              return {
                VerificationAttributes: {
                  "sender@example.com": { VerificationStatus: "Success" },
                },
              };
            }
            if (cmdName === "GetIdentityDkimAttributesCommand") {
              return {
                DkimAttributes: {
                  "sender@example.com": { DkimEnabled: true },
                },
              };
            }
            if (cmdName === "GetIdentityMailFromDomainAttributesCommand") {
              return {
                MailFromDomainAttributes: {
                  "sender@example.com": { MailFromDomain: "mail.example.com" },
                },
              };
            }
            if (cmdName === "GetSendQuotaCommand") {
              return { MaxSendRate: 14 };
            }

            return {};
          }),
        })),
      };
    }

    test("returns ready status when everything is configured", async () => {
      const provider = createMockProvider({});
      const result = await checkSesProductionReadiness(provider);

      expect(result.identityVerified).toBe(true);
      expect(result.dkimEnabled).toBe(true);
      expect(result.mailFromConfigured).toBe(true);
      expect(result.productionAccess).toBe(true);
      expect(result.recommendations.length).toBe(0);
    });

    test("returns recommendations for missing config", async () => {
      const provider = {
        _config: { from: "unverified@example.com", region: "us-east-1" },
        _getClient: jest.fn(() => ({
          send: jest.fn((command) => {
            const cmdName = command.constructor.name;

            if (cmdName === "GetIdentityVerificationAttributesCommand") {
              return {
                VerificationAttributes: {
                  "unverified@example.com": { VerificationStatus: "Pending" },
                },
              };
            }
            if (cmdName === "GetIdentityDkimAttributesCommand") {
              return {
                DkimAttributes: {
                  "unverified@example.com": { DkimEnabled: false },
                },
              };
            }
            if (cmdName === "GetIdentityMailFromDomainAttributesCommand") {
              return {
                MailFromDomainAttributes: {
                  "unverified@example.com": { MailFromDomain: null },
                },
              };
            }
            if (cmdName === "GetSendQuotaCommand") {
              return { MaxSendRate: 1 };
            }

            return {};
          }),
        })),
      };

      const result = await checkSesProductionReadiness(provider);

      expect(result.identityVerified).toBe(false);
      expect(result.dkimEnabled).toBe(false);
      expect(result.mailFromConfigured).toBe(false);
      expect(result.productionAccess).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test("handles API errors gracefully", async () => {
      const provider = {
        _config: { from: "test@example.com", region: "us-east-1" },
        _getClient: jest.fn(() => ({
          send: jest.fn().mockRejectedValue(new Error("AccessDenied")),
        })),
      };

      const result = await checkSesProductionReadiness(provider);

      expect(result.verifiedIdentities).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("validateEnvSetup", () => {
    const envBackup = { ...process.env };

    afterEach(() => {
      Object.keys(envBackup).forEach((key) => {
        if (key in envBackup) {
          process.env[key] = envBackup[key];
        }
      });
    });

    test("returns issues for missing production env", () => {
      process.env.NODE_ENV = "production";
      delete process.env.AWS_REGION;
      delete process.env.EMAIL_FROM;

      const result = validateEnvSetup();

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBe(0);
    });

    test("returns warnings for missing dev env", () => {
      process.env.NODE_ENV = "development";
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.EMAIL_FROM;

      const result = validateEnvSetup();

      expect(result.issues.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("passes when fully configured in dev", () => {
      process.env.NODE_ENV = "development";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";
      process.env.EMAIL_FROM = "test@example.com";

      const result = validateEnvSetup();

      expect(result.issues.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });
});
