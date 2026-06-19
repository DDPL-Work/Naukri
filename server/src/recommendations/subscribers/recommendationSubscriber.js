const EventBus = require("../../events/EventBus");
const { EVENTS } = require("../../events/events");
const { buildRecommendationEmail } = require("../templates/recommendationTemplates");
const { increment } = require("../metrics/recommendationMetrics");
const RecommendationHistory = require("../models/recommendationHistory.model");
const NotificationPreferences = require("../../models/NotificationPreferences");
const logger = require("../../config/logger");

const MAX_ELITE_EARLY_ACCESS_JOBS = 2;
const PLAN_DEFAULT_FREQUENCY = { FREE: "disabled", PRO: "daily", ELITE: "twice_daily" };

async function checkJobRecommendationsEnabled(userId, plan) {
  try {
    const prefs = await NotificationPreferences.findOne({ userId, role: "CANDIDATE" }).select("jobRecommendationsEnabled recommendationFrequency").lean();
    if (prefs) {
      if (prefs.jobRecommendationsEnabled === false) return false;
      if (prefs.recommendationFrequency === "disabled") return false;
      return true;
    }
  } catch {
  }
  const defaultFreq = PLAN_DEFAULT_FREQUENCY[plan] || "daily";
  return defaultFreq !== "disabled";
}

async function handleRecommendationsGenerated(eventPayload) {
  if (!eventPayload || !eventPayload.email || !eventPayload.recommendations?.length) return;

  const plan = eventPayload.membershipPlan || "PRO";

  const enabled = await checkJobRecommendationsEnabled(eventPayload.userId, plan);
  if (!enabled) return;

  const { subject, html } = buildRecommendationEmail(
    eventPayload.fullName || "there",
    eventPayload.recommendations,
    plan,
    eventPayload.userId,
    eventPayload.email
  );

  const metadata = { eventName: `recommendations.${plan.toLowerCase()}`, userId: eventPayload.userId };

  let emailModule;
  try {
    emailModule = require("../../email");
  } catch {
    logger.error("[recommendations] Email module not available");
    increment("emailFailures");
    increment("recommendationEmailFailuresTotal");
    return;
  }

  try {
    const result = await emailModule.sendEmail({
      to: eventPayload.email,
      subject,
      html,
      metadata,
    });

    increment("emailsSent");
    increment("recommendationEmailsSentTotal");

    const messageId = result?.messageId || result?.MessageId || "";
    if (messageId) {
      await RecommendationHistory.updateMany(
        { userId: eventPayload.userId, emailSentAt: { $exists: false } },
        { $set: { emailSentAt: new Date(), emailMessageId: messageId } }
      ).catch(() => {});
    }

    if (plan === "ELITE") {
      increment("elitePriorityJobsSent", Math.min(eventPayload.recommendations.length, MAX_ELITE_EARLY_ACCESS_JOBS));
    }

    logger.info("[recommendations:subscriber] Email sent", {
      plan,
      userId: eventPayload.userId,
      email: eventPayload.email ? eventPayload.email.slice(0, 3) + "***" : null,
      messageId,
      count: eventPayload.recommendations.length,
    });
  } catch (error) {
    increment("emailFailures");
    increment("recommendationEmailFailuresTotal");
    logger.error("[recommendations:subscriber] Failed to send", {
      plan,
      userId: eventPayload.userId,
      error: error.message,
    });
  }
}

function registerRecommendationSubscriber() {
  EventBus.on(EVENTS.PRO_RECOMMENDATIONS_GENERATED, (payload) => {
    handleRecommendationsGenerated(payload).catch((err) => {
      logger.error("[recommendations:subscriber] Unhandled error:", err);
    });
  });

  EventBus.on(EVENTS.ELITE_RECOMMENDATIONS_GENERATED, (payload) => {
    handleRecommendationsGenerated(payload).catch((err) => {
      logger.error("[recommendations:subscriber] Unhandled error:", err);
    });
  });

  logger.info("[recommendations:subscriber] Registered recommendation event handlers");
}

module.exports = { registerRecommendationSubscriber, handleRecommendationsGenerated, checkJobRecommendationsEnabled };
