jest.setTimeout(10000);

jest.mock("../../../src/email", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../../src/config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../../../src/models/NotificationPreferences", () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../../src/recommendations/models/recommendationHistory.model", () => ({
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
}));

const EventBus = require("../../../src/events/EventBus");
const { EVENTS } = require("../../../src/events/events");
const { registerRecommendationSubscriber, handleRecommendationsGenerated } = require("../../../src/recommendations/subscribers/recommendationSubscriber");
const emailModule = require("../../../src/email");
const { getMetrics, reset } = require("../../../src/recommendations/metrics/recommendationMetrics");

describe("recommendationSubscriber", () => {
  beforeEach(() => {
    reset();
    jest.clearAllMocks();
  });

  describe("registerRecommendationSubscriber", () => {
    it("registers handlers for both event types", () => {
      const proCount = EventBus.listenerCount(EVENTS.PRO_RECOMMENDATIONS_GENERATED);
      const eliteCount = EventBus.listenerCount(EVENTS.ELITE_RECOMMENDATIONS_GENERATED);
      registerRecommendationSubscriber();
      expect(EventBus.listenerCount(EVENTS.PRO_RECOMMENDATIONS_GENERATED)).toBe(proCount + 1);
      expect(EventBus.listenerCount(EVENTS.ELITE_RECOMMENDATIONS_GENERATED)).toBe(eliteCount + 1);
    });
  });

  describe("handleRecommendationsGenerated", () => {
    const validPayload = {
      userId: "507f191e810c19729de860ea",
      email: "ashish@example.com",
      fullName: "Ashish",
      membershipPlan: "PRO",
      recommendations: [
        { jobId: "607f191e810c19729de860eb", title: "Software Engineer", companyName: "Tech Corp", location: "Panipat", score: 95, applyUrl: "https://example.com/job1" },
      ],
      generatedAt: new Date(),
    };

    it("sends email for valid payload", async () => {
      emailModule.sendEmail.mockResolvedValue({ messageId: "msg-123" });
      await handleRecommendationsGenerated(validPayload);
      expect(emailModule.sendEmail).toHaveBeenCalledTimes(1);
      const callArgs = emailModule.sendEmail.mock.calls[0][0];
      expect(callArgs.to).toBe("ashish@example.com");
      expect(callArgs.subject).toContain("Top 3");
      expect(callArgs.html).toContain("Hi Ashish");
    });

    it("increments email metrics on success", async () => {
      emailModule.sendEmail.mockResolvedValue({ messageId: "msg-123" });
      await handleRecommendationsGenerated(validPayload);
      const metrics = getMetrics();
      expect(metrics.emailsSent).toBe(1);
    });

    it("increments failure metrics on error", async () => {
      emailModule.sendEmail.mockRejectedValue(new Error("SMTP error"));
      await handleRecommendationsGenerated(validPayload);
      const metrics = getMetrics();
      expect(metrics.emailFailures).toBe(1);
    });

    it("does nothing for empty payload", async () => {
      await handleRecommendationsGenerated(null);
      expect(emailModule.sendEmail).not.toHaveBeenCalled();
    });

    it("does nothing for empty recommendations", async () => {
      await handleRecommendationsGenerated({ email: "test@test.com", recommendations: [] });
      expect(emailModule.sendEmail).not.toHaveBeenCalled();
    });
  });
});
