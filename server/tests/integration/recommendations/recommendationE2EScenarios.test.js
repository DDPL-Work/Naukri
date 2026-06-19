const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.setTimeout(120000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  require("../../../src/models/User");
  require("../../../src/models/Job");
  require("../../../src/models/Company");
  require("../../../src/models/CandidateProfile");
  require("../../../src/models/NotificationPreferences");
  require("../../../src/recommendations/models/recommendationHistory.model");
  require("../../../src/recommendations/models/recommendationClick.model");
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Recommendation E2E Scenarios", () => {
  describe("Scenario 1: PRO User - Daily Recommendations", () => {
    it("generates ≤3 recommendations, stores history", async () => {
      const User = mongoose.model("User");
      const Job = mongoose.model("Job");
      const Company = mongoose.model("Company");
      const CandidateProfile = mongoose.model("CandidateProfile");

      const company = await Company.create({ name: "Tech Co", email: "hr@tech.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });
      for (let i = 0; i < 5; i++) {
        await Job.create({ companyId: company._id, title: `Engineer ${i}`, location: "Panipat", skills: ["Node.js", "React"], salaryMin: 300000, salaryMax: 800000, isActive: true, approvalStatus: "APPROVED" });
      }

      const user = await User.create({ name: "Pro User", email: "pro@example.com", password: "hash", role: "CANDIDATE", membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await CandidateProfile.create({ userId: user._id, currentTitle: "Engineer", preferredLocations: ["Panipat"], skills: ["Node.js", "React"], expectedSalary: "5 LPA" });

      const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");
      const results = await generateRecommendations("PRO");
      expect(results.length).toBeGreaterThanOrEqual(1);

      const userResult = results.find(r => String(r.userId) === String(user._id));
      expect(userResult).toBeTruthy();
      expect(userResult.recommendations.length).toBeLessThanOrEqual(3);
      expect(userResult.recommendations.length).toBeGreaterThanOrEqual(1);

      const RecommendationHistory = mongoose.model("RecommendationHistory");
      const historyCount = await RecommendationHistory.countDocuments({ userId: user._id });
      expect(historyCount).toBe(userResult.recommendations.length);
    });
  });

  describe("Scenario 2: ELITE User - 5 Jobs", () => {
    it("generates ≤5 recommendations for ELITE user", async () => {
      const User = mongoose.model("User");
      const Job = mongoose.model("Job");
      const Company = mongoose.model("Company");
      const CandidateProfile = mongoose.model("CandidateProfile");

      const company = await Company.create({ name: "Big Corp", email: "hr@bigcorp.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });
      for (let i = 0; i < 10; i++) {
        await Job.create({ companyId: company._id, title: `Role ${i}`, location: "Panipat", skills: ["Node.js", "React"], salaryMin: 300000, salaryMax: 800000, isActive: true, approvalStatus: "APPROVED" });
      }

      const user = await User.create({ name: "Elite User", email: "elite@example.com", password: "hash", role: "CANDIDATE", membership: { plan: "ELITE", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await CandidateProfile.create({ userId: user._id, currentTitle: "Engineer", preferredLocations: ["Panipat"], skills: ["Node.js", "React"], expectedSalary: "5 LPA" });

      const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");
      const results = await generateRecommendations("ELITE");
      const userResult = results.find(r => String(r.userId) === String(user._id));
      expect(userResult).toBeTruthy();
      expect(userResult.recommendations.length).toBeLessThanOrEqual(5);
      expect(userResult.recommendations.length).toBeGreaterThanOrEqual(1);

      const RecommendationHistory = mongoose.model("RecommendationHistory");
      const historyCount = await RecommendationHistory.countDocuments({ userId: user._id });
      expect(historyCount).toBe(userResult.recommendations.length);
    });
  });

  describe("Scenario 3: Recommendations Disabled", () => {
    it("skips users with disabled recommendations", async () => {
      const User = mongoose.model("User");
      const NotificationPreferences = mongoose.model("NotificationPreferences");

      const user = await User.create({ name: "Disabled User", email: "disabled@example.com", password: "hash", role: "CANDIDATE", membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await NotificationPreferences.create({ userId: user._id, role: "CANDIDATE", jobRecommendationsEnabled: false, recommendationFrequency: "disabled" });

      const { getEffectiveFrequency } = require("../../../src/recommendations/scheduler/recommendationScheduler");
      const freq = await getEffectiveFrequency(user._id, "PRO");
      expect(freq).toBe("disabled");

      const { filterUsersByFrequency } = require("../../../src/recommendations/scheduler/recommendationScheduler");
      const { included } = await filterUsersByFrequency([{ _id: user._id, email: user.email }], "PRO");
      expect(included).toHaveLength(0);
    });
  });

  describe("Scenario 4: Weekly Frequency - Already Sent", () => {
    it("skips user when already sent this week", async () => {
      const User = mongoose.model("User");
      const NotificationPreferences = mongoose.model("NotificationPreferences");
      const RecommendationHistory = mongoose.model("RecommendationHistory");

      const user = await User.create({ name: "Weekly User", email: "weekly@example.com", password: "hash", role: "CANDIDATE", membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await NotificationPreferences.create({ userId: user._id, role: "CANDIDATE", jobRecommendationsEnabled: true, recommendationFrequency: "weekly" });
      await RecommendationHistory.create({ userId: user._id, jobId: new mongoose.Types.ObjectId(), recommendationType: "pro", score: 80, emailSentAt: new Date() });

      const { filterUsersByFrequency } = require("../../../src/recommendations/scheduler/recommendationScheduler");
      const { included, skipped } = await filterUsersByFrequency([{ _id: user._id, email: user.email }], "PRO");
      expect(included).toHaveLength(0);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toContain("week");
    });
  });

  describe("Scenario 5: Click Tracking", () => {
    it("stores click and redirects", async () => {
      const User = mongoose.model("User");
      const user = await User.create({ name: "Test", email: "test@test.com", password: "hash", role: "CANDIDATE" });

      const { trackClick } = require("../../../src/controllers/recommendations.controller");
      const metricsModule = require("../../../src/recommendations/metrics/recommendationMetrics");
      metricsModule.reset();

      const mockReq = { query: { jobId: new mongoose.Types.ObjectId().toString(), userId: String(user._id), messageId: "msg-123" } };
      let redirectUrl = "";
      const mockRes = { redirect: (url) => { redirectUrl = url; } };

      await trackClick(mockReq, mockRes);
      expect(redirectUrl).toContain("/jobs/");

      const RecommendationClick = mongoose.model("RecommendationClick");
      const clickCount = await RecommendationClick.countDocuments({ userId: user._id });
      expect(clickCount).toBe(1);

      const m = metricsModule.getMetrics();
      expect(m.clicks).toBeGreaterThanOrEqual(1);
    });

    it("redirects even without userId", async () => {
      const { trackClick } = require("../../../src/controllers/recommendations.controller");
      let redirectUrl = "";
      const mockRes = { redirect: (url) => { redirectUrl = url; } };
      const mockReq = { query: { jobId: new mongoose.Types.ObjectId().toString() } };

      await trackClick(mockReq, mockRes);
      expect(redirectUrl).toContain("/jobs/");
    });
  });

  describe("Scenario 6: Unsubscribe", () => {
    it("validates token and updates preferences", async () => {
      const User = mongoose.model("User");
      const NotificationPreferences = mongoose.model("NotificationPreferences");

      const user = await User.create({ name: "Unsub User", email: "unsub@example.com", password: "hash", role: "CANDIDATE", membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await NotificationPreferences.create({ userId: user._id, role: "CANDIDATE", jobRecommendationsEnabled: true, recommendationFrequency: "daily" });

      const { generateUnsubscribeToken, verifyUnsubscribeToken } = require("../../../src/recommendations/utils/unsubscribeToken");
      const { token } = generateUnsubscribeToken(String(user._id), "unsub@example.com", "recommendations");

      const verified = verifyUnsubscribeToken(token);
      expect(verified).toBeTruthy();
      expect(verified.userId).toBe(String(user._id));
      expect(verified.purpose).toBe("recommendations");

      const { unsubscribe } = require("../../../src/controllers/recommendations.controller");
      let jsonResponse = null;
      const mockRes = {
        status: (code) => ({ json: (data) => { jsonResponse = { code, data }; } }),
      };
      const mockReq = { query: { token, type: "recommendations" } };

      await unsubscribe(mockReq, mockRes);
      expect(jsonResponse.code).toBe(200);
      expect(jsonResponse.data.success).toBe(true);

      const prefs = await NotificationPreferences.findOne({ userId: user._id });
      expect(prefs.jobRecommendationsEnabled).toBe(false);
      expect(prefs.recommendationFrequency).toBe("disabled");
    });

    it("rejects invalid token", async () => {
      const { unsubscribe } = require("../../../src/controllers/recommendations.controller");
      let jsonResponse = null;
      const mockRes = {
        status: (code) => ({ json: (data) => { jsonResponse = { code, data }; } }),
      };
      const mockReq = { query: { token: "bad-token", type: "recommendations" } };

      await unsubscribe(mockReq, mockRes);
      expect(jsonResponse.code).toBe(400);
    });
  });

  describe("Manual Scheduler Execution", () => {
    it("runProRecommendations returns summary", async () => {
      const User = mongoose.model("User");
      const Job = mongoose.model("Job");
      const Company = mongoose.model("Company");
      const CandidateProfile = mongoose.model("CandidateProfile");

      const company = await Company.create({ name: "Test", email: "t@t.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });
      await Job.create({ companyId: company._id, title: "Engineer", location: "Panipat", skills: ["Node"], salaryMin: 300000, salaryMax: 500000, isActive: true, approvalStatus: "APPROVED" });
      const user = await User.create({ name: "Manual", email: "manual@test.com", password: "hash", role: "CANDIDATE", membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await CandidateProfile.create({ userId: user._id, currentTitle: "Engineer", preferredLocations: ["Panipat"], skills: ["Node"], expectedSalary: "5 LPA" });

      const { runProRecommendations } = require("../../../src/recommendations/scheduler/recommendationScheduler");
      const summary = await runProRecommendations();
      expect(summary).toBeTruthy();
      expect(summary.plan).toBe("PRO");
      expect(summary.mode).toBe("manual");
      expect(typeof summary.usersProcessed).toBe("number");
      expect(typeof summary.duration).toBe("number");
    });
  });

  describe("Validation Helpers", () => {
    it("validateProExecution returns checks", async () => {
      const User = mongoose.model("User");
      const Job = mongoose.model("Job");
      const Company = mongoose.model("Company");
      const CandidateProfile = mongoose.model("CandidateProfile");

      const company = await Company.create({ name: "Test", email: "t@t.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });
      await Job.create({ companyId: company._id, title: "Engineer", location: "Panipat", skills: ["Node"], salaryMin: 300000, salaryMax: 500000, isActive: true, approvalStatus: "APPROVED" });
      const user = await User.create({ name: "Val", email: "val@test.com", password: "hash", role: "CANDIDATE", membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) } });
      await CandidateProfile.create({ userId: user._id, currentTitle: "Engineer", preferredLocations: ["Panipat"], skills: ["Node"], expectedSalary: "5 LPA" });

      const { validateProExecution } = require("../../../src/recommendations/scheduler/recommendationScheduler");
      const result = await validateProExecution();
      expect(result).toBeTruthy();
      expect(result.plan).toBe("PRO");
      expect(typeof result.passed).toBe("boolean");
      expect(result.checks).toBeTruthy();
      expect(typeof result.durationMs).toBe("number");
    });
  });
});
