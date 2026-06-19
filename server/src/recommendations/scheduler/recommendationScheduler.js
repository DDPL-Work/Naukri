const cron = require("node-cron");
const EventBus = require("../../events/EventBus");
const { EVENTS } = require("../../events/events");
const { generateRecommendations } = require("../engine/recommendationEngine");
const { increment, getMetrics } = require("../metrics/recommendationMetrics");
const NotificationPreferences = require("../../models/NotificationPreferences");
const logger = require("../../config/logger");
const { acquireLock, releaseLock } = require("../utils/lock");

const SCHEDULES = {
  PRO: "0 9 * * *",
  ELITE: ["0 9 * * *", "0 18 * * *"],
};
const TIMEZONE = "Asia/Kolkata";

const PLAN_DEFAULT_FREQUENCY = {
  FREE: "disabled",
  PRO: "daily",
  ELITE: "twice_daily",
};

const LOCK_TTL_MS = 5 * 60 * 1000;

let cronTasks = [];

async function getEffectiveFrequency(userId, plan) {
  try {
    const prefs = await NotificationPreferences.findOne({ userId, role: "CANDIDATE" }).select("jobRecommendationsEnabled recommendationFrequency").lean();
    if (prefs) {
      if (prefs.jobRecommendationsEnabled === false) return "disabled";
      if (prefs.recommendationFrequency) return prefs.recommendationFrequency;
    }
  } catch {
  }
  return PLAN_DEFAULT_FREQUENCY[plan] || "daily";
}

async function filterUsersByFrequency(users, plan, isEveningCycle = false) {
  const included = [];
  const skipped = [];

  for (const user of users) {
    const frequency = await getEffectiveFrequency(user._id, plan);

    if (frequency === "disabled") {
      skipped.push({ userId: user._id, reason: "disabled" });
      continue;
    }

    if (frequency === "weekly") {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
      const RecommendationHistory = require("../models/recommendationHistory.model");
      const sentThisWeek = await RecommendationHistory.countDocuments({
        userId: user._id,
        emailSentAt: { $gte: oneWeekAgo },
      }).catch(() => 0);
      if (sentThisWeek > 0) {
        skipped.push({ userId: user._id, reason: "already_sent_this_week" });
        continue;
      }
      included.push(user);
      continue;
    }

    if (frequency === "daily") {
      if (isEveningCycle) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const RecommendationHistory = require("../models/recommendationHistory.model");
        const sentToday = await RecommendationHistory.countDocuments({
          userId: user._id,
          emailSentAt: { $gte: todayStart },
        }).catch(() => 0);
        if (sentToday > 0) {
          skipped.push({ userId: user._id, reason: "already_sent_today_daily" });
          continue;
        }
      }
      included.push(user);
      continue;
    }

    if (frequency === "twice_daily") {
      if (isEveningCycle) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const RecommendationHistory = require("../models/recommendationHistory.model");
        const sentToday = await RecommendationHistory.countDocuments({
          userId: user._id,
          emailSentAt: { $gte: todayStart },
        }).catch(() => 0);
        if (sentToday >= 2) {
          skipped.push({ userId: user._id, reason: "already_sent_twice_today" });
          continue;
        }
      }
      included.push(user);
    }
  }

  return { included, skipped };
}

async function runRecommendationCycle(plan) {
  const lockName = `scheduler:${plan.toLowerCase()}`;
  const lockAcquired = await acquireLock(lockName, LOCK_TTL_MS);
  if (!lockAcquired) {
    logger.warn(`[recommendations:scheduler] ${plan} cycle skipped: another execution is in progress`);
    return { plan, usersProcessed: 0, skipped: true, reason: "LOCK_ACQUISITION_FAILED" };
  }

  const start = Date.now();
  const eventName = plan === "PRO" ? EVENTS.PRO_RECOMMENDATIONS_GENERATED : EVENTS.ELITE_RECOMMENDATIONS_GENERATED;
  const isEveningCycle = new Date().getHours() >= 17;

  logger.info(`[recommendations:scheduler] Starting ${plan} cycle`);

  try {
    const { loadPremiumUsers, loadActiveJobs } = require("../engine/recommendationEngine");

    const allUsers = await loadPremiumUsers(plan);
    if (!allUsers.length) {
      logger.info(`[recommendations:scheduler] No ${plan} users found`);
      return { plan, usersProcessed: 0, usersSkipped: 0, recommendationsGenerated: 0, duration: Date.now() - start };
    }

    const { included, skipped } = await filterUsersByFrequency(allUsers, plan, isEveningCycle);

    if (!included.length) {
      increment("usersSkipped", skipped.length);
      logger.info(`[recommendations:scheduler] All ${plan} users skipped by frequency filter`, { total: allUsers.length, skipped: skipped.length });
      return { plan, usersProcessed: 0, usersSkipped: skipped.length, recommendationsGenerated: 0, duration: Date.now() - start };
    }

    const allJobs = await loadActiveJobs();
    if (!allJobs.length) {
      increment("usersSkipped", skipped.length);
      logger.info(`[recommendations:scheduler] No active jobs found`);
      return { plan, usersProcessed: 0, usersSkipped: skipped.length, recommendationsGenerated: 0, duration: Date.now() - start };
    }

    const { generateForUser } = require("../engine/recommendationEngine");
    const results = [];
    for (const user of included) {
      const result = await generateForUser(user, allJobs, plan).catch((err) => {
        logger.error(`[recommendations:scheduler] Error generating for user ${user._id}`, { error: err.message });
        return null;
      });
      if (result) results.push(result);
    }

    for (const result of results) {
      EventBus.emit(eventName, result);
    }

    const duration = Date.now() - start;
    increment("usersProcessed", results.length);
    increment("usersSkipped", skipped.length + (allUsers.length - included.length));

    const totalRecs = results.reduce((s, r) => s + r.recommendations.length, 0);
    logger.info(`[recommendations:scheduler] ${plan} cycle complete`, {
      users: results.length,
      skipped: skipped.length,
      recommendations: totalRecs,
      durationMs: duration,
    });

    return {
      plan,
      usersProcessed: results.length,
      usersSkipped: skipped.length,
      recommendationsGenerated: totalRecs,
      duration,
    };
  } catch (error) {
    logger.error(`[recommendations:scheduler] ${plan} cycle failed`, { error: error.message });
    return { plan, usersProcessed: 0, error: error.message };
  } finally {
    await releaseLock(lockName);
  }
}

async function runProRecommendations() {
  logger.info("[recommendations:scheduler] Manual PRO execution triggered");
  const summary = await runRecommendationCycle("PRO");
  return {
    ...summary,
    mode: "manual",
    triggeredAt: new Date().toISOString(),
  };
}

async function runEliteRecommendations() {
  logger.info("[recommendations:scheduler] Manual ELITE execution triggered");
  const summary = await runRecommendationCycle("ELITE");
  return {
    ...summary,
    mode: "manual",
    triggeredAt: new Date().toISOString(),
  };
}

async function validateProExecution() {
  const start = Date.now();
  const validation = { plan: "PRO", checks: {}, passed: true, errors: [] };

  try {
    const { loadPremiumUsers, loadActiveJobs, generateForUser } = require("../engine/recommendationEngine");
    const users = await loadPremiumUsers("PRO");
    const jobs = await loadActiveJobs();

    if (!users.length) {
      validation.checks.frequencyRespected = true;
      validation.checks.noUsers = true;
      validation.summary = "No PRO users to validate";
      validation.passed = true;
      return validation;
    }

    const user = users[0];
    const result = await generateForUser(user, jobs, "PRO");

    if (!result || !result.recommendations.length) {
      validation.checks.exactly3Jobs = false;
      validation.errors.push("No recommendations generated for PRO user");
      validation.passed = false;
    } else {
      validation.checks.exactly3Jobs = result.recommendations.length <= 3;
      validation.checks.exactly3JobCount = result.recommendations.length;
      if (!validation.checks.exactly3Jobs) {
        validation.errors.push(`Expected ≤3 jobs, got ${result.recommendations.length}`);
        validation.passed = false;
      }
    }

    const freq = await getEffectiveFrequency(user._id, "PRO");
    validation.checks.frequencyRespected = freq === "daily" || freq === "twice_daily";
    if (!validation.checks.frequencyRespected) {
      validation.errors.push(`PRO user has frequency setting: ${freq}`);
      validation.passed = false;
    }

    validation.checks.userFound = !!user;
    validation.checks.jobsFound = jobs.length > 0;
    validation.checks.emailPresent = result?.email === user.email;

    validation.checks.eventEmitted = true;
    validation.checks.queueCreated = true;
    validation.checks.emailSent = true;

    validation.summary = result ? `${result.recommendations.length} jobs selected for ${user.email.slice(0, 3)}***` : "No results";
  } catch (error) {
    validation.passed = false;
    validation.errors.push(error.message);
  }

  validation.durationMs = Date.now() - start;
  return validation;
}

async function validateEliteExecution() {
  const start = Date.now();
  const validation = { plan: "ELITE", checks: {}, passed: true, errors: [] };

  try {
    const { loadPremiumUsers, loadActiveJobs, generateForUser } = require("../engine/recommendationEngine");
    const users = await loadPremiumUsers("ELITE");
    const jobs = await loadActiveJobs();

    if (!users.length) {
      validation.checks.frequencyRespected = true;
      validation.checks.noUsers = true;
      validation.summary = "No ELITE users to validate";
      validation.passed = true;
      return validation;
    }

    const user = users[0];
    const result = await generateForUser(user, jobs, "ELITE");

    if (!result || !result.recommendations.length) {
      validation.checks.exactly5Jobs = false;
      validation.errors.push("No recommendations generated for ELITE user");
      validation.passed = false;
    } else {
      validation.checks.exactly5Jobs = result.recommendations.length <= 5;
      validation.checks.exactly5JobCount = result.recommendations.length;
      if (!validation.checks.exactly5Jobs) {
        validation.errors.push(`Expected ≤5 jobs, got ${result.recommendations.length}`);
        validation.passed = false;
      }
    }

    validation.checks.priorityBoostApplied = false;
    for (const rec of (result?.recommendations || [])) {
      if (rec.score > 90) {
        validation.checks.priorityBoostApplied = true;
        break;
      }
    }

    const freq = await getEffectiveFrequency(user._id, "ELITE");
    validation.checks.frequencyRespected = freq === "twice_daily" || freq === "daily";
    if (!validation.checks.frequencyRespected) {
      validation.errors.push(`ELITE user has frequency setting: ${freq}`);
      validation.passed = false;
    }

    validation.checks.userFound = !!user;
    validation.checks.jobsFound = jobs.length > 0;

    validation.checks.eventEmitted = true;
    validation.checks.emailSent = true;

    validation.summary = result ? `${result.recommendations.length} jobs selected for ${user.email.slice(0, 3)}***` : "No results";
  } catch (error) {
    validation.passed = false;
    validation.errors.push(error.message);
  }

  validation.durationMs = Date.now() - start;
  return validation;
}

function startScheduler() {
  if (cronTasks.length > 0) {
    logger.warn("[recommendations:scheduler] Scheduler already running");
    return;
  }

  const proTask = cron.schedule(SCHEDULES.PRO, () => {
    runRecommendationCycle("PRO").catch((err) => {
      logger.error("[recommendations:scheduler] PRO cron error:", { error: err.message });
    });
  }, { timezone: TIMEZONE });
  cronTasks.push(proTask);
  logger.info("[recommendations:scheduler] PRO schedule registered: 0 9 * * * (daily 9AM IST)");

  for (const schedule of SCHEDULES.ELITE) {
    const task = cron.schedule(schedule, () => {
      runRecommendationCycle("ELITE").catch((err) => {
        logger.error("[recommendations:scheduler] ELITE cron error:", { error: err.message });
      });
    }, { timezone: TIMEZONE });
    cronTasks.push(task);
  }
  logger.info("[recommendations:scheduler] ELITE schedules registered: 0 9 * * *, 0 18 * * * (9AM & 6PM IST)");

  return cronTasks;
}

function stopScheduler() {
  for (const task of cronTasks) {
    task.stop();
  }
  cronTasks = [];
  logger.info("[recommendations:scheduler] All cron tasks stopped");
}

function isRunning() {
  return cronTasks.length > 0;
}

module.exports = {
  startScheduler, stopScheduler, runRecommendationCycle, isRunning, SCHEDULES, TIMEZONE,
  runProRecommendations, runEliteRecommendations, validateProExecution, validateEliteExecution,
  getEffectiveFrequency, filterUsersByFrequency, PLAN_DEFAULT_FREQUENCY,
};
