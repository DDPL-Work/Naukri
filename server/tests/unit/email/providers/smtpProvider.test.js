const SmtpEmailProvider = require("../../../../src/email/providers/smtpProvider");
const EmailDeliveryError = require("../../../../src/email/errors/EmailDeliveryError");

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

const nodemailer = require("nodemailer");

describe("SmtpEmailProvider", () => {
  const mockConfig = {
    host: "smtp.example.com",
    port: 587,
    user: "testuser",
    pass: "testpass",
    from: "test@example.com",
  };

  let mockTransporter;
  let provider;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);

    process.env.SMTP_HOST = mockConfig.host;
    process.env.SMTP_PORT = String(mockConfig.port);
    process.env.SMTP_USER = mockConfig.user;
    process.env.SMTP_PASS = mockConfig.pass;
    process.env.EMAIL_FROM = mockConfig.from;

    provider = new SmtpEmailProvider();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
  });

  describe("constructor", () => {
    test("creates provider with env vars", () => {
      expect(provider).toBeDefined();
      expect(provider._config.host).toBe(mockConfig.host);
      expect(provider._config.from).toBe(mockConfig.from);
    });

    test("throws on missing config", () => {
      delete process.env.SMTP_HOST;

      expect(() => new SmtpEmailProvider()).toThrow(EmailDeliveryError);
      expect(() => new SmtpEmailProvider()).toThrow(/SMTP configuration is incomplete/);
    });
  });

  describe("sendEmail", () => {
    const sendOptions = {
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    };

    test("sends email successfully", async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: "test-message-id",
        response: "250 OK",
      });

      const result = await provider.sendEmail(sendOptions);

      expect(result).toEqual({
        success: true,
        messageId: "test-message-id",
        provider: "smtp",
        response: "250 OK",
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: mockConfig.from,
          to: sendOptions.to,
          subject: sendOptions.subject,
          html: sendOptions.html,
          text: sendOptions.text,
        })
      );
    });

    test("sends plain text only", async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: "msg-1",
        response: "250 OK",
      });

      const result = await provider.sendEmail({
        to: "user@example.com",
        subject: "Plain text",
        text: "Just text",
      });

      expect(result.success).toBe(true);
    });

    test("sends with attachments", async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: "msg-2",
        response: "250 OK",
      });

      const attachments = [
        { filename: "test.pdf", content: Buffer.from("test") },
      ];

      await provider.sendEmail({
        ...sendOptions,
        attachments,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: "test.pdf" }),
          ]),
        })
      );
    });

    test("retries on transient failure then succeeds", async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce({ code: "ETIMEDOUT", message: "Timeout" })
        .mockResolvedValueOnce({ messageId: "msg-retry", response: "250 OK" });

      const result = await provider.sendEmail(sendOptions);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    test("fails after exhausting retries", async () => {
      mockTransporter.sendMail.mockRejectedValue({
        code: "ServiceUnavailable",
        message: "Service unavailable",
      });

      await expect(provider.sendEmail(sendOptions)).rejects.toThrow(EmailDeliveryError);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    test("does not retry on non-transient errors", async () => {
      mockTransporter.sendMail.mockRejectedValue({
        code: "InvalidAddress",
        message: "Invalid email address",
      });

      await expect(provider.sendEmail({ ...sendOptions, to: "invalid" })).rejects.toThrow(EmailDeliveryError);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    test("throws on missing recipient", async () => {
      await expect(provider.sendEmail({ subject: "Test" })).rejects.toThrow(EmailDeliveryError);
      await expect(provider.sendEmail({ subject: "Test" })).rejects.toThrow(/Recipient/);
    });

    test("throws on missing subject", async () => {
      await expect(provider.sendEmail({ to: "user@example.com" })).rejects.toThrow(EmailDeliveryError);
    });
  });

  describe("verifyConnection", () => {
    test("verifies successfully", async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await provider.verifyConnection();
      expect(result).toBe(true);
    });

    test("throws on verification failure", async () => {
      mockTransporter.verify.mockRejectedValue(new Error("Connection failed"));

      await expect(provider.verifyConnection()).rejects.toThrow(EmailDeliveryError);
    });
  });

  describe("close", () => {
    test("closes transporter", () => {
      provider._getTransporter();
      provider.close();

      expect(mockTransporter.close).toHaveBeenCalledTimes(1);
      expect(provider._transporter).toBeNull();
    });

    test("handles close when not initialized", () => {
      expect(() => provider.close()).not.toThrow();
    });
  });
});
