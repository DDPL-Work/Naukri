const SesEmailProvider = require("../../../../src/email/providers/sesProvider");
const EmailDeliveryError = require("../../../../src/email/errors/EmailDeliveryError");

const mockSend = jest.fn();
const mockDestroy = jest.fn();

jest.mock("@aws-sdk/client-ses", () => ({
  SESClient: jest.fn(() => ({
    send: mockSend,
    destroy: mockDestroy,
  })),
  SendEmailCommand: jest.fn((params) => ({ __command: params })),
  GetIdentityVerificationAttributesCommand: jest.fn(),
}));

describe("SesEmailProvider", () => {
  const mockConfig = {
    region: "ap-south-1",
    accessKeyId: "AKIA12345",
    secretAccessKey: "secret123",
    from: "sender@example.com",
  };

  let provider;

  beforeEach(() => {
    process.env.AWS_REGION = mockConfig.region;
    process.env.AWS_ACCESS_KEY_ID = mockConfig.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = mockConfig.secretAccessKey;
    process.env.EMAIL_FROM = mockConfig.from;

    mockSend.mockReset();
    mockDestroy.mockReset();

    provider = new SesEmailProvider();
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.EMAIL_FROM;
  });

  describe("constructor", () => {
    test("creates provider with env vars", () => {
      expect(provider).toBeDefined();
      expect(provider._config.region).toBe(mockConfig.region);
      expect(provider._config.from).toBe(mockConfig.from);
    });

    test("throws on missing region", () => {
      delete process.env.AWS_REGION;
      expect(() => new SesEmailProvider()).toThrow(EmailDeliveryError);
      expect(() => new SesEmailProvider()).toThrow(/AWS region is not configured/);
    });

    test("throws on missing from address", () => {
      delete process.env.EMAIL_FROM;
      expect(() => new SesEmailProvider()).toThrow(EmailDeliveryError);
      expect(() => new SesEmailProvider()).toThrow(/Sender email/);
    });
  });

  describe("sendEmail", () => {
    const sendOptions = {
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello plain",
    };

    test("sends email successfully", async () => {
      mockSend.mockResolvedValue({
        MessageId: "aws-msg-12345",
        $metadata: { httpStatusCode: 200 },
      });

      const result = await provider.sendEmail(sendOptions);

      expect(result).toEqual({
        success: true,
        messageId: "aws-msg-12345",
        provider: "ses",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test("sends plain text only", async () => {
      mockSend.mockResolvedValue({ MessageId: "msg-2" });

      const result = await provider.sendEmail({
        to: "user@example.com",
        subject: "Plain text",
        text: "Just text",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-2");
    });

    test("retries on throttling then succeeds", async () => {
      mockSend
        .mockRejectedValueOnce({
          name: "ThrottlingException",
          message: "Rate exceeded",
          $metadata: { httpStatusCode: 400 },
        })
        .mockResolvedValueOnce({ MessageId: "msg-retry" });

      const result = await provider.sendEmail(sendOptions);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test("retries on 5xx errors", async () => {
      mockSend
        .mockRejectedValueOnce({
          name: "ServiceUnavailableException",
          message: "Service unavailable",
          $metadata: { httpStatusCode: 503 },
        })
        .mockResolvedValueOnce({ MessageId: "msg-5xx-retry" });

      const result = await provider.sendEmail(sendOptions);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test("fails after exhausting retries", async () => {
      mockSend.mockRejectedValue({
        name: "ThrottlingException",
        message: "Rate exceeded",
        $metadata: { httpStatusCode: 400 },
      });

      await expect(provider.sendEmail(sendOptions)).rejects.toThrow(EmailDeliveryError);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    test("does not retry on permanent errors", async () => {
      mockSend.mockRejectedValue({
        name: "MessageRejected",
        message: "Email address is not verified",
        $metadata: { httpStatusCode: 400 },
      });

      await expect(provider.sendEmail(sendOptions)).rejects.toThrow(EmailDeliveryError);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test("throws on missing recipient", async () => {
      await expect(provider.sendEmail({ subject: "Test", html: "<p>Hi</p>" })).rejects.toThrow(EmailDeliveryError);
    });

    test("throws on missing subject", async () => {
      await expect(provider.sendEmail({ to: "user@example.com", html: "<p>Hi</p>" })).rejects.toThrow(EmailDeliveryError);
    });

    test("throws when no body provided", async () => {
      await expect(provider.sendEmail({ to: "user@example.com", subject: "Hi" })).rejects.toThrow(EmailDeliveryError);
    });

    test("handles array of recipients", async () => {
      mockSend.mockResolvedValue({ MessageId: "msg-multi" });

      const result = await provider.sendEmail({
        to: ["a@example.com", "b@example.com"],
        subject: "Multiple",
        html: "<p>Hi</p>",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("close", () => {
    test("destroys client", () => {
      provider._getClient();
      provider.close();

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(provider._client).toBeNull();
    });

    test("handles close when not initialized", () => {
      expect(() => provider.close()).not.toThrow();
    });
  });
});
