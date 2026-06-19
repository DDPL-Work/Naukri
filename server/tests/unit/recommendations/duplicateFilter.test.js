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

describe("duplicateFilter", () => {
  it("filters out jobs already recommended within 30 days", async () => {
    const { filterDuplicates } = require("../../../src/recommendations/engine/duplicateFilter");
    const RecommendationHistory = require("../../../src/recommendations/models/recommendationHistory.model");

    const userId = new mongoose.Types.ObjectId();
    const jobId1 = new mongoose.Types.ObjectId();
    const jobId2 = new mongoose.Types.ObjectId();
    const jobId3 = new mongoose.Types.ObjectId();

    await RecommendationHistory.create({
      userId,
      jobId: jobId1,
      recommendationType: "pro",
      score: 80,
    });

    const result = await filterDuplicates(userId, [jobId1, jobId2, jobId3]);
    expect(result.map(String)).not.toContain(String(jobId1));
    expect(result.map(String)).toContain(String(jobId2));
    expect(result.map(String)).toContain(String(jobId3));
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", async () => {
    const { filterDuplicates } = require("../../../src/recommendations/engine/duplicateFilter");
    const result = await filterDuplicates(new mongoose.Types.ObjectId(), []);
    expect(result).toEqual([]);
  });

  it("returns all jobIds when no history exists", async () => {
    const { filterDuplicates } = require("../../../src/recommendations/engine/duplicateFilter");
    const userId = new mongoose.Types.ObjectId();
    const jobId1 = new mongoose.Types.ObjectId();
    const jobId2 = new mongoose.Types.ObjectId();

    const result = await filterDuplicates(userId, [jobId1, jobId2]);
    expect(result).toHaveLength(2);
  });
});
