const EmailProviderFactory = require("../../../../src/email/factory/emailProviderFactory");
const SmtpEmailProvider = require("../../../../src/email/providers/smtpProvider");
const SesEmailProvider = require("../../../../src/email/providers/sesProvider");

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    verify: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock("@aws-sdk/client-ses", () => ({
  SESClient: jest.fn(() => ({
    send: jest.fn(),
    destroy: jest.fn(),
  })),
  SendEmailCommand: jest.fn(),
}));

describe("EmailProviderFactory", () => {
  const envBackup = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = envBackup;
  });

  describe("createProvider", () => {
    test("returns SesEmailProvider for production", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.EMAIL_FROM = "test@example.com";

      const provider = EmailProviderFactory.createProvider({ env: "production" });

      expect(provider).toBeInstanceOf(SesEmailProvider);

      delete process.env.AWS_REGION;
      delete process.env.EMAIL_FROM;
    });

    test("returns SmtpEmailProvider for development", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const provider = EmailProviderFactory.createProvider({ env: "development" });

      expect(provider).toBeInstanceOf(SmtpEmailProvider);

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    test("returns SmtpEmailProvider for test", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const provider = EmailProviderFactory.createProvider({ env: "test" });

      expect(provider).toBeInstanceOf(SmtpEmailProvider);

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    test("returns SmtpEmailProvider for staging", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const provider = EmailProviderFactory.createProvider({ env: "staging" });

      expect(provider).toBeInstanceOf(SmtpEmailProvider);

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    test("returns SmtpEmailProvider for unknown env", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const provider = EmailProviderFactory.createProvider({ env: "unknown" });

      expect(provider).toBeInstanceOf(SmtpEmailProvider);

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    test("uses NODE_ENV from process.env when not specified", () => {
      process.env.NODE_ENV = "development";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const provider = EmailProviderFactory.createProvider();

      expect(provider).toBeInstanceOf(SmtpEmailProvider);

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    test("passes options to provider", () => {
      const options = {
        env: "production",
        region: "eu-west-1",
        from: "custom@example.com",
      };

      process.env.EMAIL_FROM = options.from;

      const provider = EmailProviderFactory.createProvider(options);

      expect(provider).toBeInstanceOf(SesEmailProvider);
      expect(provider._config.region).toBe("eu-west-1");

      delete process.env.EMAIL_FROM;
    });
  });

  describe("createSmtpProvider", () => {
    test("creates SmtpEmailProvider", () => {
      const provider = EmailProviderFactory.createSmtpProvider({
        host: "host",
        user: "u",
        pass: "p",
      });

      expect(provider).toBeInstanceOf(SmtpEmailProvider);
    });
  });

  describe("createSesProvider", () => {
    test("creates SesEmailProvider", () => {
      const provider = EmailProviderFactory.createSesProvider({
        region: "us-east-1",
        from: "test@example.com",
      });

      expect(provider).toBeInstanceOf(SesEmailProvider);
    });
  });
});
