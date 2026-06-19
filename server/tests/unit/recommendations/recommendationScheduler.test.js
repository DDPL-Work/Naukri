jest.mock("node-cron", () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

jest.mock("../../../src/recommendations/models/recommendationHistory.model", () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
  insertMany: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../../src/models/NotificationPreferences");

function makePrefsQuery(result) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

const cron = require("node-cron");
const NotificationPreferences = require("../../../src/models/NotificationPreferences");
const {
  startScheduler, stopScheduler, isRunning, SCHEDULES,
  getEffectiveFrequency, filterUsersByFrequency, PLAN_DEFAULT_FREQUENCY,
} = require("../../../src/recommendations/scheduler/recommendationScheduler");

describe("recommendationScheduler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopScheduler();

    NotificationPreferences.findOne.mockImplementation(({ userId }) => {
      const uid = String(userId);
      if (uid.includes("disabled")) {
        return makePrefsQuery({ jobRecommendationsEnabled: false, recommendationFrequency: "disabled" });
      }
      if (uid.includes("weekly")) {
        return makePrefsQuery({ jobRecommendationsEnabled: true, recommendationFrequency: "weekly" });
      }
      if (uid.includes("daily")) {
        return makePrefsQuery({ jobRecommendationsEnabled: true, recommendationFrequency: "daily" });
      }
      if (uid.includes("twice")) {
        return makePrefsQuery({ jobRecommendationsEnabled: true, recommendationFrequency: "twice_daily" });
      }
      return makePrefsQuery(null);
    });
  });

  afterAll(() => {
    stopScheduler();
  });

  describe("startScheduler", () => {
    it("registers PRO and ELITE cron tasks", () => {
      startScheduler();
      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });

    it("uses correct cron expression for PRO", () => {
      startScheduler();
      expect(cron.schedule).toHaveBeenCalledWith(
        SCHEDULES.PRO,
        expect.any(Function),
        expect.objectContaining({ timezone: "Asia/Kolkata" })
      );
    });

    it("uses correct cron expressions for ELITE", () => {
      startScheduler();
      for (const schedule of SCHEDULES.ELITE) {
        expect(cron.schedule).toHaveBeenCalledWith(
          schedule,
          expect.any(Function),
          expect.objectContaining({ timezone: "Asia/Kolkata" })
        );
      }
    });

    it("reports running state", () => {
      expect(isRunning()).toBe(false);
      startScheduler();
      expect(isRunning()).toBe(true);
    });

    it("does not register duplicate tasks", () => {
      startScheduler();
      startScheduler();
      expect(cron.schedule).toHaveBeenCalledTimes(3);
    });
  });

  describe("stopScheduler", () => {
    it("stops all cron tasks", () => {
      startScheduler();
      expect(isRunning()).toBe(true);
      stopScheduler();
      expect(isRunning()).toBe(false);
    });
  });

  describe("getEffectiveFrequency", () => {
    it("returns disabled when preferences have disabled frequency", async () => {
      const freq = await getEffectiveFrequency("disabled-user-id", "PRO");
      expect(freq).toBe("disabled");
    });

    it("returns weekly for weekly preference", async () => {
      const freq = await getEffectiveFrequency("weekly-user-id", "PRO");
      expect(freq).toBe("weekly");
    });

    it("returns daily for PRO without preferences", async () => {
      const freq = await getEffectiveFrequency("no-prefs", "PRO");
      expect(freq).toBe("daily");
    });

    it("returns twice_daily for ELITE without preferences", async () => {
      const freq = await getEffectiveFrequency("no-prefs", "ELITE");
      expect(freq).toBe("twice_daily");
    });

    it("returns disabled for FREE without preferences", async () => {
      const freq = await getEffectiveFrequency("no-prefs", "FREE");
      expect(freq).toBe("disabled");
    });
  });

  describe("filterUsersByFrequency", () => {
    it("includes users with matching frequency", async () => {
      const users = [{ _id: "daily-user-id", email: "daily@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "PRO");
      expect(included).toHaveLength(1);
      expect(skipped).toHaveLength(0);
    });

    it("skips users with disabled frequency", async () => {
      const users = [{ _id: "disabled-user-id", email: "disabled@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "PRO");
      expect(included).toHaveLength(0);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe("disabled");
    });

    it("includes twice_daily users in morning cycle", async () => {
      const users = [{ _id: "twice-user-id", email: "twice@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "ELITE", false);
      expect(included).toHaveLength(1);
      expect(skipped).toHaveLength(0);
    });

    it("filters daily users in evening cycle if already sent today", async () => {
      const RecommendationHistory = require("../../../src/recommendations/models/recommendationHistory.model");
      RecommendationHistory.countDocuments.mockResolvedValue(1);
      const users = [{ _id: "daily-user-id", email: "daily@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "PRO", true);
      expect(included).toHaveLength(0);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe("already_sent_today_daily");
    });

    it("includes twice_daily users in evening cycle if sent <2 times", async () => {
      const RecommendationHistory = require("../../../src/recommendations/models/recommendationHistory.model");
      RecommendationHistory.countDocuments.mockResolvedValue(1);
      const users = [{ _id: "twice-user-id", email: "twice@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "ELITE", true);
      expect(included).toHaveLength(1);
      expect(skipped).toHaveLength(0);
    });

    it("skips twice_daily users in evening cycle if already sent twice", async () => {
      const RecommendationHistory = require("../../../src/recommendations/models/recommendationHistory.model");
      RecommendationHistory.countDocuments.mockResolvedValue(2);
      const users = [{ _id: "twice-user-id", email: "twice@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "ELITE", true);
      expect(included).toHaveLength(0);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].reason).toBe("already_sent_twice_today");
    });

    it("handles users without preferences (uses plan default)", async () => {
      const users = [{ _id: "no-prefs", email: "noprefs@test.com" }];
      const { included, skipped } = await filterUsersByFrequency(users, "PRO");
      expect(included).toHaveLength(1);
      expect(skipped).toHaveLength(0);
    });
  });

  describe("PLAN_DEFAULT_FREQUENCY", () => {
    it("maps FREE to disabled", () => {
      expect(PLAN_DEFAULT_FREQUENCY.FREE).toBe("disabled");
    });

    it("maps PRO to daily", () => {
      expect(PLAN_DEFAULT_FREQUENCY.PRO).toBe("daily");
    });

    it("maps ELITE to twice_daily", () => {
      expect(PLAN_DEFAULT_FREQUENCY.ELITE).toBe("twice_daily");
    });
  });
});
