const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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

describe("Recommendation Engine E2E", () => {
  it("generates recommendations for PRO user", async () => {
    const User = require("../../../src/models/User");
    const Job = require("../../../src/models/Job");
    const Company = require("../../../src/models/Company");
    const CandidateProfile = require("../../../src/models/CandidateProfile");
    const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");

    const company = await Company.create({ name: "Tech Corp", email: "hr@techcorp.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });

    await Job.create({ companyId: company._id, title: "Software Engineer", location: "Panipat", skills: ["Node.js", "React"], salaryMin: 300000, salaryMax: 800000, isActive: true, approvalStatus: "APPROVED" });
    await Job.create({ companyId: company._id, title: "Backend Engineer", location: "Delhi", skills: ["Node.js", "MongoDB"], salaryMin: 400000, salaryMax: 900000, isActive: true, approvalStatus: "APPROVED" });
    await Job.create({ companyId: company._id, title: "DevOps Engineer", location: "Remote", skills: ["AWS", "Docker"], salaryMin: 600000, salaryMax: 1200000, isActive: true, approvalStatus: "APPROVED" });
    await Job.create({ companyId: company._id, title: "Data Scientist", location: "Bangalore", skills: ["Python", "ML"], salaryMin: 800000, salaryMax: 1500000, isActive: true, approvalStatus: "APPROVED" });

    const user = await User.create({
      name: "Ashish",
      email: "ashish@example.com",
      password: "hashed123",
      role: "CANDIDATE",
      membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) },
    });

    await CandidateProfile.create({
      userId: user._id,
      currentTitle: "Software Engineer",
      preferredLocations: ["Panipat"],
      skills: ["Node.js", "React", "MongoDB"],
      expectedSalary: "5 LPA",
      education: "BCA",
    });

    const results = await generateRecommendations("PRO");
    expect(results.length).toBeGreaterThanOrEqual(1);

    const userResult = results.find((r) => String(r.userId) === String(user._id));
    expect(userResult).toBeTruthy();
    expect(userResult.recommendations.length).toBeLessThanOrEqual(3);
    expect(userResult.membershipPlan).toBe("PRO");

    for (const rec of userResult.recommendations) {
      expect(rec.title).toBeTruthy();
      expect(rec.companyName).toBe("Tech Corp");
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.applyUrl).toContain("/jobs/");
    }
  });

  it("generates up to 5 recommendations for ELITE user", async () => {
    const User = require("../../../src/models/User");
    const Job = require("../../../src/models/Job");
    const Company = require("../../../src/models/Company");
    const CandidateProfile = require("../../../src/models/CandidateProfile");
    const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");

    const company = await Company.create({ name: "Big Corp", email: "hr@bigcorp.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });

    for (let i = 0; i < 8; i++) {
      await Job.create({
        companyId: company._id,
        title: `Engineer ${i}`,
        location: "Panipat",
        skills: ["Node.js", "React"],
        salaryMin: 300000,
        salaryMax: 800000,
        isActive: true,
        approvalStatus: "APPROVED",
      });
    }

    const user = await User.create({
      name: "Elite User",
      email: "elite@example.com",
      password: "hashed123",
      role: "CANDIDATE",
      membership: { plan: "ELITE", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) },
    });

    await CandidateProfile.create({
      userId: user._id,
      currentTitle: "Engineer",
      preferredLocations: ["Panipat"],
      skills: ["Node.js", "React"],
      expectedSalary: "5 LPA",
    });

    const results = await generateRecommendations("ELITE");
    const userResult = results.find((r) => String(r.userId) === String(user._id));
    expect(userResult).toBeTruthy();
    expect(userResult.recommendations.length).toBeLessThanOrEqual(5);
    expect(userResult.membershipPlan).toBe("ELITE");
  });

  it("excludes previously recommended jobs", async () => {
    const User = require("../../../src/models/User");
    const Job = require("../../../src/models/Job");
    const Company = require("../../../src/models/Company");
    const CandidateProfile = require("../../../src/models/CandidateProfile");
    const RecommendationHistory = require("../../../src/recommendations/models/recommendationHistory.model");
    const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");

    const company = await Company.create({ name: "Test Co", email: "hr@testco.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });

    const job1 = await Job.create({ companyId: company._id, title: "Software Engineer", location: "Panipat", skills: ["Node.js", "React"], salaryMin: 300000, salaryMax: 800000, isActive: true, approvalStatus: "APPROVED" });
    const job2 = await Job.create({ companyId: company._id, title: "Backend Engineer", location: "Delhi", skills: ["Node.js", "MongoDB"], salaryMin: 400000, salaryMax: 900000, isActive: true, approvalStatus: "APPROVED" });
    const job3 = await Job.create({ companyId: company._id, title: "Full Stack Developer", location: "Panipat", skills: ["React", "Node"], salaryMin: 300000, salaryMax: 700000, isActive: true, approvalStatus: "APPROVED" });

    const user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "hashed123",
      role: "CANDIDATE",
      membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) },
    });

    await CandidateProfile.create({
      userId: user._id,
      currentTitle: "Software Engineer",
      preferredLocations: ["Panipat"],
      skills: ["Node.js", "React"],
      expectedSalary: "5 LPA",
    });

    await RecommendationHistory.create({ userId: user._id, jobId: job3._id, recommendationType: "pro", score: 80 });

    const results = await generateRecommendations("PRO");
    const userResult = results.find((r) => String(r.userId) === String(user._id));
    expect(userResult).toBeTruthy();
    const recommendedIds = userResult.recommendations.map((r) => String(r.jobId));
    expect(recommendedIds).not.toContain(String(job3._id));
  });

  it("skips users without candidate profile", async () => {
    const User = require("../../../src/models/User");
    const Job = require("../../../src/models/Job");
    const Company = require("../../../src/models/Company");
    const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");

    const company = await Company.create({ name: "Test Co", email: "hr@testco.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });
    await Job.create({ companyId: company._id, title: "Engineer", location: "Panipat", skills: ["Node"], isActive: true, approvalStatus: "APPROVED" });

    await User.create({
      name: "No Profile",
      email: "noprofile@example.com",
      password: "hashed",
      role: "CANDIDATE",
      membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) },
    });

    const results = await generateRecommendations("PRO");
    expect(results).toHaveLength(0);
  });

  it("excludes INACTIVE companies' jobs", async () => {
    const User = require("../../../src/models/User");
    const Job = require("../../../src/models/Job");
    const Company = require("../../../src/models/Company");
    const CandidateProfile = require("../../../src/models/CandidateProfile");
    const { generateRecommendations } = require("../../../src/recommendations/engine/recommendationEngine");

    const inactiveCompany = await Company.create({ name: "Dead Co", email: "dead@co.com", status: "INACTIVE", createdByCRM: new mongoose.Types.ObjectId() });
    const activeCompany = await Company.create({ name: "Live Co", email: "live@co.com", status: "ACTIVE", createdByCRM: new mongoose.Types.ObjectId() });

    await Job.create({ companyId: inactiveCompany._id, title: "Old Role", location: "Delhi", skills: ["Node"], isActive: true, approvalStatus: "APPROVED" });
    await Job.create({ companyId: activeCompany._id, title: "Live Role", location: "Panipat", skills: ["Node"], isActive: true, approvalStatus: "APPROVED" });

    const user = await User.create({
      name: "Test",
      email: "test@example.com",
      password: "hashed",
      role: "CANDIDATE",
      membership: { plan: "PRO", active: true, startedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000) },
    });

    await CandidateProfile.create({
      userId: user._id,
      currentTitle: "Engineer",
      preferredLocations: ["Panipat"],
      skills: ["Node"],
      expectedSalary: "5 LPA",
    });

    const results = await generateRecommendations("PRO");
    const userResult = results.find((r) => String(r.userId) === String(user._id));
    expect(userResult).toBeTruthy();
    for (const rec of userResult.recommendations) {
      expect(rec.title).not.toBe("Old Role");
    }
  });
});
