const RecommendationHistory = require("../models/recommendationHistory.model");

const DEFAULT_EXCLUSION_DAYS = 30;

async function filterDuplicates(userId, jobIds, exclusionDays = DEFAULT_EXCLUSION_DAYS) {
  if (!jobIds?.length) return [];

  const since = new Date(Date.now() - exclusionDays * 24 * 60 * 60 * 1000);

  const history = await RecommendationHistory.find({
    userId,
    createdAt: { $gte: since },
  }).select("jobId").lean();

  const recommendedJobIds = new Set(history.map((h) => String(h.jobId)));
  return jobIds.filter((id) => !recommendedJobIds.has(String(id)));
}

module.exports = { filterDuplicates, DEFAULT_EXCLUSION_DAYS };
