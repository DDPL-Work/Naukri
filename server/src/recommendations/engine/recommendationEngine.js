const User = require("../../models/User");
const Job = require("../../models/Job");
const CandidateProfile = require("../../models/CandidateProfile");
const { scoreJob } = require("./scoringEngine");
const { filterDuplicates } = require("./duplicateFilter");
const RecommendationHistory = require("../models/recommendationHistory.model");
const { increment } = require("../metrics/recommendationMetrics");
const { isEligibleForRecommendations, checkAndExpireMembership } = require("../utils/eligibilityValidator");
const { validateCandidateProfile } = require("../utils/profileValidator");
const logger = require("../../config/logger");

const LIMITS = { PRO: 3, ELITE: 5 };
const BATCH_SIZE = 100;

async function loadPremiumUsers(plan) {
  const now = new Date();
  const users = await User.find({
    role: "CANDIDATE",
    "membership.plan": plan,
    "membership.active": true,
    isActive: true,
    "membership.expiresAt": { $gt: now },
  })
    .select("_id name email membership isActive role")
    .lean();

  const eligible = [];
  for (const user of users) {
    const check = isEligibleForRecommendations(user);
    if (check.eligible) {
      eligible.push(user);
    } else {
      logger.warn(`[engine] Skipping user ${user._id}: ${check.reason}`, {
        userId: user._id,
        reason: check.reason,
      });
    }
  }

  return eligible;
}

async function loadActiveJobs() {
  const now = new Date();
  const jobs = await Job.find({
    isActive: true,
    approvalStatus: "APPROVED",
    $or: [
      { deadline: { $exists: false } },
      { deadline: null },
      { deadline: { $gt: now } },
    ],
  })
    .populate("companyId", "name status")
    .lean();

  return jobs.filter((j) => j.companyId && j.companyId.status !== "INACTIVE" && j.companyId.name);
}

async function validateJobsAvailable() {
  const count = await Job.countDocuments({
    isActive: true,
    approvalStatus: "APPROVED",
  });
  return count > 0;
}

async function generateForUser(user, jobs, plan) {
  const profile = await CandidateProfile.findOne({ userId: user._id }).lean();

  const profileCheck = validateCandidateProfile(profile);
  if (!profileCheck.valid) {
    logger.warn(`[engine] Skipping user ${user._id}: invalid profile - ${profileCheck.reason}`, {
      userId: user._id,
      reason: profileCheck.reason,
    });
    return null;
  }

  const scored = jobs
    .map((job) => ({
      jobId: job._id,
      title: job.title,
      companyName: job.companyId?.name || "",
      location: job.location || "",
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experience: job.experience || "",
      score: scoreJob(profile, job),
      createdAt: job.createdAt,
    }))
    .sort((a, b) => b.score - a.score);

  const limit = LIMITS[plan] || 3;
  const topJobIds = scored.slice(0, Math.min(scored.length, limit * 3)).map((j) => j.jobId);
  const available = await filterDuplicates(user._id, topJobIds);

  const results = scored
    .filter((j) => available.some((a) => String(a) === String(j.jobId)))
    .slice(0, limit);

  if (results.length === 0) return null;

  increment("recommendationsGenerated", results.length);
  increment("recommendationEmailsSentTotal", 0);

  const historyDocs = results.map((r) => ({
    userId: user._id,
    jobId: r.jobId,
    score: r.score,
    recommendationType: plan.toLowerCase(),
  }));
  await RecommendationHistory.insertMany(historyDocs, { ordered: false }).catch(() => {});

  return {
    userId: user._id,
    email: user.email,
    fullName: user.name,
    membershipPlan: plan,
    recommendations: results.map((r) => ({
      jobId: r.jobId,
      title: r.title,
      companyName: r.companyName,
      location: r.location,
      salaryRange: formatSalary(r.salaryMin, r.salaryMax),
      experience: r.experience,
      score: r.score,
      applyUrl: `${process.env.FRONTEND_URL || "https://maven-jobs.com"}/jobs/${r.jobId}`,
    })),
    generatedAt: new Date(),
  };
}

function formatSalary(min, max) {
  if (!min && !max) return "";
  const fmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)} LPA`;
    return `₹${(v / 1000).toFixed(0)}K`;
  };
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt(min || max);
}

async function generateRecommendations(plan) {
  const start = Date.now();
  increment("totalRuns");

  await checkAndExpireMembership(User);

  const jobsAvailable = await validateJobsAvailable();
  if (!jobsAvailable) {
    logger.info(`[engine] No active approved jobs available, skipping ${plan} cycle`);
    return { success: true, reason: "NO_ACTIVE_JOBS" };
  }

  const [users, jobs] = await Promise.all([loadPremiumUsers(plan), loadActiveJobs()]);

  if (!users.length) {
    logger.info(`[engine] No eligible ${plan} users found`);
    return [];
  }

  if (!jobs.length) {
    logger.info(`[engine] No active jobs found for ${plan} cycle`);
    return { success: true, reason: "NO_ACTIVE_JOBS" };
  }

  const results = [];
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((user) => generateForUser(user, jobs, plan))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) {
        results.push(r.value);
      }
    }
  }

  increment("totalScore", results.length);
  return results;
}

module.exports = { generateRecommendations, generateForUser, loadPremiumUsers, loadActiveJobs, formatSalary, validateJobsAvailable };
