const { validateCandidateProfile } = require("../../../src/recommendations/utils/profileValidator");

describe("profileValidator", () => {
  const validProfile = () => ({
    currentTitle: "Software Engineer",
    skills: ["Node.js", "React"],
    preferredLocations: ["Panipat"],
  });

  describe("validateCandidateProfile", () => {
    it("returns valid for complete profile", () => {
      const result = validateCandidateProfile(validProfile());
      expect(result.valid).toBe(true);
    });

    it("returns no_profile for null", () => {
      const result = validateCandidateProfile(null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("no_profile");
    });

    it("returns no_profile for undefined", () => {
      const result = validateCandidateProfile(undefined);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("no_profile");
    });

    it("reports missing currentTitle", () => {
      const profile = validProfile();
      delete profile.currentTitle;
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("currentTitle");
    });

    it("reports missing skills", () => {
      const profile = validProfile();
      delete profile.skills;
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("skills");
    });

    it("reports missing preferredLocations", () => {
      const profile = validProfile();
      delete profile.preferredLocations;
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("preferredLocations");
    });

    it("reports empty skills array", () => {
      const profile = validProfile();
      profile.skills = [];
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("skills");
    });

    it("reports empty currentTitle string", () => {
      const profile = validProfile();
      profile.currentTitle = "";
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("currentTitle");
    });

    it("reports multiple missing fields", () => {
      const profile = validProfile();
      delete profile.currentTitle;
      delete profile.skills;
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("currentTitle");
      expect(result.reason).toContain("skills");
    });

    it("accepts profile with additional fields", () => {
      const profile = {
        ...validProfile(),
        expectedSalary: "5 LPA",
        education: "BCA",
        totalExperience: "3 years",
      };
      const result = validateCandidateProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
});
