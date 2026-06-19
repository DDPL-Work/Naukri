const { isEligibleForRecommendations } = require("../../../src/recommendations/utils/eligibilityValidator");

describe("eligibilityValidator", () => {
  const validUser = () => ({
    _id: "user123",
    role: "CANDIDATE",
    isActive: true,
    membership: {
      plan: "PRO",
      active: true,
      expiresAt: new Date(Date.now() + 365 * 86400000),
    },
  });

  describe("isEligibleForRecommendations", () => {
    it("returns eligible for valid PRO user", () => {
      const result = isEligibleForRecommendations(validUser());
      expect(result.eligible).toBe(true);
    });

    it("returns eligible for valid ELITE user", () => {
      const user = validUser();
      user.membership.plan = "ELITE";
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(true);
    });

    it("returns not_candidate for non-CANDIDATE role", () => {
      const user = validUser();
      user.role = "ADMIN";
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("not_candidate");
    });

    it("returns user_inactive when isActive is false", () => {
      const user = validUser();
      user.isActive = false;
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("user_inactive");
    });

    it("returns no_membership when membership is missing", () => {
      const user = validUser();
      delete user.membership;
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("no_membership");
    });

    it("returns membership_inactive when membership.active is false", () => {
      const user = validUser();
      user.membership.active = false;
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("membership_inactive");
    });

    it("returns invalid_plan for FREE plan", () => {
      const user = validUser();
      user.membership.plan = "FREE";
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("invalid_plan");
    });

    it("returns no_expiry_date when expiresAt is missing", () => {
      const user = validUser();
      delete user.membership.expiresAt;
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("no_expiry_date");
    });

    it("returns membership_expired when membership is expired", () => {
      const user = validUser();
      user.membership.expiresAt = new Date(Date.now() - 86400000);
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("membership_expired");
    });

    it("returns no_user for null input", () => {
      const result = isEligibleForRecommendations(null);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("no_user");
    });

    it("returns no_user for undefined input", () => {
      const result = isEligibleForRecommendations(undefined);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("no_user");
    });

    it("returns membership_inactive for default FREE membership", () => {
      const user = {
        _id: "new-user",
        role: "CANDIDATE",
        isActive: true,
        membership: { plan: "FREE", active: false, expiresAt: null },
      };
      const result = isEligibleForRecommendations(user);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("membership_inactive");
    });
  });
});
