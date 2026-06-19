const { generateRecommendations, generateForUser } = require("./engine/recommendationEngine");
const { scoreJob } = require("./engine/scoringEngine");
const { filterDuplicates } = require("./engine/duplicateFilter");
const { startScheduler, stopScheduler, runRecommendationCycle, isRunning,
  runProRecommendations, runEliteRecommendations, validateProExecution, validateEliteExecution,
  getEffectiveFrequency, filterUsersByFrequency } = require("./scheduler/recommendationScheduler");
const { registerRecommendationSubscriber } = require("./subscribers/recommendationSubscriber");
const { buildRecommendationEmail, buildClickUrl } = require("./templates/recommendationTemplates");
const { getMetrics, reset } = require("./metrics/recommendationMetrics");
const { normalizeSalary, isSalaryInRange } = require("./utils/salaryNormalizer");
const { generateUnsubscribeToken, verifyUnsubscribeToken } = require("./utils/unsubscribeToken");
const { isEligibleForRecommendations, checkAndExpireMembership } = require("./utils/eligibilityValidator");
const { validateCandidateProfile } = require("./utils/profileValidator");
const { scoreNormalizedSkillMatch, getSkillCategories } = require("./utils/skillNormalizer");
const { acquireLock, releaseLock, isLocked, clearAllLocks } = require("./utils/lock");
const RecommendationHistory = require("./models/recommendationHistory.model");
const RecommendationClick = require("./models/recommendationClick.model");

function init() {
  registerRecommendationSubscriber();
  startScheduler();
}

function shutdown() {
  stopScheduler();
}

module.exports = {
  init,
  shutdown,
  generateRecommendations,
  generateForUser,
  scoreJob,
  filterDuplicates,
  runRecommendationCycle,
  isRunning,
  runProRecommendations,
  runEliteRecommendations,
  validateProExecution,
  validateEliteExecution,
  getEffectiveFrequency,
  filterUsersByFrequency,
  buildRecommendationEmail,
  buildClickUrl,
  getMetrics,
  reset,
  normalizeSalary,
  isSalaryInRange,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  isEligibleForRecommendations,
  checkAndExpireMembership,
  validateCandidateProfile,
  scoreNormalizedSkillMatch,
  getSkillCategories,
  acquireLock,
  releaseLock,
  isLocked,
  clearAllLocks,
  RecommendationHistory,
  RecommendationClick,
};
