const EmailService = require("../../../../src/email/service/emailService");
const EmailDeliveryError = require("../../../../src/email/errors/EmailDeliveryError");

describe("EmailService", () => {
  let mockProvider;
  let service;

  beforeEach(() => {
    mockProvider = {
      sendEmail: jest.fn(),
    };

    service = new EmailService(mockProvider);
  });

  describe("constructor", () => {
    test("creates service with valid provider", () => {
      expect(service).toBeDefined();
      expect(service.getProvider()).toBe(mockProvider);
    });

    test("throws without provider", () => {
      expect(() => new EmailService()).toThrow(EmailDeliveryError);
    });

    test("throws when provider has no sendEmail", () => {
      expect(() => new EmailService({})).toThrow(EmailDeliveryError);
    });
  });

  describe("sendEmail", () => {
    const options = {
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    };

    test("delegates to provider", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      const result = await service.sendEmail(options);

      expect(result).toEqual({ success: true, messageId: "msg-1" });
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(options);
    });

    test("throws on missing recipient", async () => {
      await expect(service.sendEmail({ subject: "Test", html: "<p>Hi</p>" })).rejects.toThrow(EmailDeliveryError);
    });

    test("throws on missing subject", async () => {
      await expect(service.sendEmail({ to: "user@example.com", html: "<p>Hi</p>" })).rejects.toThrow(EmailDeliveryError);
    });

    test("throws on missing body", async () => {
      await expect(service.sendEmail({ to: "user@example.com", subject: "Test" })).rejects.toThrow(EmailDeliveryError);
    });

    test("wraps provider errors in EmailDeliveryError", async () => {
      mockProvider.sendEmail.mockRejectedValue(new Error("Provider error"));

      await expect(service.sendEmail(options)).rejects.toThrow(EmailDeliveryError);
    });

    test("re-throws EmailDeliveryError from provider", async () => {
      const deliveryError = new EmailDeliveryError("Bad config", {
        code: EmailDeliveryError.CODES.CONFIGURATION_ERROR,
      });
      mockProvider.sendEmail.mockRejectedValue(deliveryError);

      await expect(service.sendEmail(options)).rejects.toThrow(EmailDeliveryError);
    });
  });

  describe("sendWelcomeEmail", () => {
    test("sends welcome email with correct content", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "welcome-msg",
      });

      const result = await service.sendWelcomeEmail({
        to: "new@example.com",
        name: "John",
      });

      expect(result.success).toBe(true);
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "new@example.com",
          subject: expect.stringContaining("Welcome"),
        })
      );
    });

    test("sends welcome email without name", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "welcome-msg-2",
      });

      const result = await service.sendWelcomeEmail({
        to: "new@example.com",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendPasswordResetEmail", () => {
    test("sends reset email with link", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "reset-msg",
      });

      const result = await service.sendPasswordResetEmail({
        to: "user@example.com",
        name: "Jane",
        resetLink: "https://example.com/reset/token123",
      });

      expect(result.success).toBe(true);
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Reset"),
        })
      );
    });

    test("sends reset email without resetLink", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "reset-msg",
      });

      const result = await service.sendPasswordResetEmail({
        to: "user@example.com",
        name: "Jane",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendOTPEmail", () => {
    test("sends OTP email with code", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "otp-msg",
      });

      const result = await service.sendOTPEmail({
        to: "user@example.com",
        name: "Bob",
        otp: "482916",
      });

      expect(result.success).toBe(true);
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("OTP"),
        })
      );
    });

    test("sends OTP email without name", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "otp-msg-2",
      });

      const result = await service.sendOTPEmail({
        to: "user@example.com",
        otp: "123456",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendJobApplicationConfirmation", () => {
    test("sends application confirmation", async () => {
      mockProvider.sendEmail.mockResolvedValue({
        success: true,
        messageId: "app-msg",
      });

      const result = await service.sendJobApplicationConfirmation({
        to: "candidate@example.com",
        name: "Alice",
        jobTitle: "Software Engineer",
        companyName: "Tech Corp",
      });

      expect(result.success).toBe(true);
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Application submitted"),
        })
      );
    });
  });

  describe("verifyConnection", () => {
    test("delegates to provider", async () => {
      mockProvider.verifyConnection = jest.fn().mockResolvedValue(true);

      const result = await service.verifyConnection();
      expect(result).toBe(true);
    });

    test("throws if provider has no verifyConnection", async () => {
      await expect(service.verifyConnection()).rejects.toThrow(EmailDeliveryError);
    });
  });

  describe("close", () => {
    test("delegates to provider", () => {
      mockProvider.close = jest.fn();
      service.close();
      expect(mockProvider.close).toHaveBeenCalledTimes(1);
    });

    test("handles provider without close method", () => {
      expect(() => service.close()).not.toThrow();
    });
  });
});
