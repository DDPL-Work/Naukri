const { maskEmail, maskIP, checkPreferences, sendEmailSafe } = require("../../../src/subscribers/subscriberUtils");
const { EVENTS } = require("../../../src/events/events");

jest.mock("../../../src/email", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../../src/email/metrics/metrics", () => ({
  incrementCounter: jest.fn(),
}));

jest.mock("../../../src/config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../../../src/models/NotificationPreferences", () => ({
  findOne: jest.fn(),
}));

const emailModule = require("../../../src/email");
const NotificationPreferences = require("../../../src/models/NotificationPreferences");
const { incrementCounter } = require("../../../src/email/metrics/metrics");

describe("subscriberUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationPreferences.findOne.mockResolvedValue(null);
    emailModule.sendEmail.mockResolvedValue({ messageId: "msg-1" });
  });

  describe("maskEmail", () => {
    test("masks email address", () => {
      expect(maskEmail("john@example.com")).toBe("j***@example.com");
    });

    test("returns null/undefined as-is", () => {
      expect(maskEmail(null)).toBe(null);
      expect(maskEmail(undefined)).toBe(undefined);
    });

    test("handles short emails", () => {
      expect(maskEmail("a@b.com")).toBe("a@b.com");
    });
  });

  describe("maskIP", () => {
    test("masks IP address", () => {
      expect(maskIP("192.168.1.100")).toBe("192.***.***.100");
    });

    test("returns N/A for falsy", () => {
      expect(maskIP(null)).toBe("N/A");
      expect(maskIP("")).toBe("N/A");
    });
  });

  describe("checkPreferences", () => {
    test("returns true for events in SKIP_PREFERENCES_EVENTS", async () => {
      const result = await checkPreferences(EVENTS.CANDIDATE_REGISTERED, "user1");
      expect(result).toBe(true);
    });

    test("returns true when no preferences document exists", async () => {
      NotificationPreferences.findOne.mockResolvedValue(null);
      const result = await checkPreferences(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, "user1");
      expect(result).toBe(true);
    });

    test("returns false when preference is disabled", async () => {
      NotificationPreferences.findOne.mockImplementation(() => ({
        lean: () => Promise.resolve({ applicationUpdates: false }),
      }));
      const result = await checkPreferences(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, "user1");
      expect(result).toBe(false);
    });

    test("returns true when preference is enabled", async () => {
      NotificationPreferences.findOne.mockImplementation(() => ({
        lean: () => Promise.resolve({ applicationUpdates: true }),
      }));
      const result = await checkPreferences(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, "user1");
      expect(result).toBe(true);
    });

    test("returns true for events not in preferences map", async () => {
      const result = await checkPreferences("some.unknown.event", "user1");
      expect(result).toBe(true);
    });

    test("handles database errors gracefully", async () => {
      NotificationPreferences.findOne.mockImplementation(() => ({
        lean: () => Promise.reject(new Error("DB error")),
      }));
      const result = await checkPreferences(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, "user1");
      expect(result).toBe(true);
    });
  });

  describe("sendEmailSafe", () => {
    test("sends email and logs success", async () => {
      emailModule.sendEmail.mockResolvedValue({ messageId: "msg-1" });
      const result = await sendEmailSafe({
        eventName: "test.event",
        to: "user@test.com",
        subject: "Test",
        html: "<p>Hi</p>",
      });
      expect(result).toEqual({ messageId: "msg-1" });
      expect(incrementCounter).toHaveBeenCalledWith("emails_sent_total");
    });

    test("logs warning on failure and does not throw", async () => {
      emailModule.sendEmail.mockRejectedValue(new Error("SMTP error"));
      const result = await sendEmailSafe({
        eventName: "test.event",
        to: "user@test.com",
        subject: "Test",
        html: "<p>Hi</p>",
      });
      expect(result).toBeNull();
      expect(incrementCounter).toHaveBeenCalledWith("emails_failed_total");
    });
  });
});
