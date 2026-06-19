const RecommendationClick = require("../recommendations/models/recommendationClick.model");
const NotificationPreferences = require("../models/NotificationPreferences");
const { increment, getMetrics } = require("../recommendations/metrics/recommendationMetrics");
const { verifyUnsubscribeToken } = require("../recommendations/utils/unsubscribeToken");
const logger = require("../config/logger");
const Job = require("../models/Job");

async function trackClick(req, res) {
  try {
    const { jobId, userId, messageId } = req.query;

    if (!jobId) {
      return res.redirect(`${process.env.FRONTEND_URL || "https://maven-jobs.com"}/jobs`);
    }

    if (userId) {
      await RecommendationClick.create({
        userId,
        jobId,
        emailMessageId: messageId || "",
        clickedAt: new Date(),
        recommendationType: messageId?.startsWith("rec-") ? "pro" : "pro",
      }).catch(() => {});
      increment("clicks");
      increment("recommendationClicksTotal");
    }

    let jobExists = true;
    if (jobId) {
      const job = await Job.findById(jobId).select("_id isActive").lean().catch(() => null);
      if (!job || !job.isActive) {
        jobExists = false;
        increment("failedClicks");
        logger.warn("[recommendations:click] Job not found or inactive, redirecting to /jobs", { jobId });
      }
    }

    const redirectUrl = jobExists
      ? `${process.env.FRONTEND_URL || "https://maven-jobs.com"}/jobs/${encodeURIComponent(String(jobId))}`
      : `${process.env.FRONTEND_URL || "https://maven-jobs.com"}/jobs/`;

    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error("[recommendations:click] Error tracking click", { error: error.message });
    return res.redirect(`${process.env.FRONTEND_URL || "https://maven-jobs.com"}/jobs`);
  }
}

async function unsubscribe(req, res) {
  try {
    const { token, type } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, code: "MISSING_TOKEN", message: "Missing unsubscribe token" });
    }

    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired unsubscribe token" });
    }

    const { userId, purpose } = payload;

    if (!userId) {
      return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "Token payload missing userId" });
    }

    if (purpose === "recommendations" || type === "recommendations") {
      await NotificationPreferences.updateOne(
        { userId, role: "CANDIDATE" },
        { $set: { jobRecommendationsEnabled: false, recommendationFrequency: "disabled" } },
        { upsert: true }
      ).catch(() => {});
    }

    if (purpose === "marketing") {
      await NotificationPreferences.updateOne(
        { userId, role: "CANDIDATE" },
        { $set: { marketingEmails: false } },
        { upsert: true }
      ).catch(() => {});
    }

    if (purpose === "blog_updates") {
      await NotificationPreferences.updateOne(
        { userId, role: "CANDIDATE" },
        { $set: { blogUpdates: false } },
        { upsert: true }
      ).catch(() => {});
    }

    increment("unsubscribesTotal");
    increment("recommendationUnsubscribesTotal");

    logger.info("[recommendations:unsubscribe] User unsubscribed", {
      userId,
      purpose,
      email: payload.email ? payload.email.slice(0, 3) + "***" : null,
    });

    return res.status(200).json({
      success: true,
      code: "UNSUBSCRIBED",
      message: "You have been unsubscribed from recommendation emails.",
    });
  } catch (error) {
    logger.error("[recommendations:unsubscribe] Error", { error: error.message });
    return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to process unsubscribe" });
  }
}

async function getClickStats(req, res) {
  try {
    const metrics = getMetrics();
    const totalClicks = await RecommendationClick.countDocuments();
    const last24h = await RecommendationClick.countDocuments({
      clickedAt: { $gte: new Date(Date.now() - 86400000) },
    });

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        totalClicks,
        last24hClicks: last24h,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { trackClick, unsubscribe, getClickStats };
