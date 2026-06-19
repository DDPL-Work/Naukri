const { scoreJob, scoreSkillMatch, scoreRoleMatch, scoreLocationMatch, scoreEducationMatch, normalize, tokenize, fuzzyTokenMatch } = require("../../../src/recommendations/engine/scoringEngine");

describe("scoringEngine", () => {
  describe("normalize", () => {
    it("lowercases and trims", () => {
      expect(normalize("  Hello World  ")).toBe("hello world");
    });
  });

  describe("tokenize", () => {
    it("splits by common delimiters", () => {
      const tokens = tokenize("Node.js, React; Python");
      expect(tokens).toContain("node");
      expect(tokens).toContain("js");
      expect(tokens).toContain("react");
      expect(tokens).toContain("python");
    });
  });

  describe("fuzzyTokenMatch", () => {
    it("finds exact matches", () => {
      expect(fuzzyTokenMatch(["node"], ["node"])).toBe(1);
    });

    it("finds prefix matches", () => {
      expect(fuzzyTokenMatch(["node"], ["nodejs"])).toBe(1);
      expect(fuzzyTokenMatch(["nodejs"], ["node"])).toBe(1);
    });

    it("finds substring matches", () => {
      expect(fuzzyTokenMatch(["express"], ["expressjs"])).toBe(1);
    });

    it("returns 0 for no match", () => {
      expect(fuzzyTokenMatch(["python"], ["java"])).toBe(0);
    });
  });

  describe("scoreSkillMatch", () => {
    it("returns 50 for perfect match", () => {
      expect(scoreSkillMatch(["Node.js", "React"], ["Node.js", "React"])).toBe(50);
    });

    it("returns partial for fuzzy match", () => {
      const score = scoreSkillMatch(["Node"], ["Node.js"]);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(50);
    });

    it("returns 0 for empty skills", () => {
      expect(scoreSkillMatch([], ["Node"])).toBe(0);
      expect(scoreSkillMatch(["Node"], [])).toBe(0);
    });
  });

  describe("scoreRoleMatch", () => {
    it("returns 20 for exact match", () => {
      expect(scoreRoleMatch(["Software Engineer"], "Software Engineer")).toBe(20);
    });

    it("returns 20 for high similarity (>=50%)", () => {
      expect(scoreRoleMatch(["Full Stack Developer"], "Full Stack Engineer")).toBe(20);
      expect(scoreRoleMatch(["Backend Engineer"], "Senior Backend Engineer")).toBe(20);
    });

    it("returns 0 for no match", () => {
      expect(scoreRoleMatch(["Doctor"], "Software Engineer")).toBe(0);
    });

    it("handles multiple titles", () => {
      expect(scoreRoleMatch(["Junior Dev", "Software Engineer"], "Software Engineer")).toBe(20);
    });
  });

  describe("scoreLocationMatch", () => {
    it("returns 15 for exact match", () => {
      expect(scoreLocationMatch(["Panipat"], "Panipat")).toBe(15);
    });

    it("returns 8 for remote", () => {
      expect(scoreLocationMatch(["Delhi"], "Remote")).toBe(8);
    });

    it("returns 10 for same state", () => {
      expect(scoreLocationMatch(["Panipat"], "Karnal")).toBe(10);
    });

    it("returns 5 for same country", () => {
      expect(scoreLocationMatch(["New York"], "Los Angeles")).toBe(5);
    });

    it("returns 0 for empty input", () => {
      expect(scoreLocationMatch([], "Delhi")).toBe(0);
    });
  });

  describe("scoreEducationMatch", () => {
    it("returns 5 for exact match", () => {
      expect(scoreEducationMatch("BCA", "BCA")).toBe(5);
    });

    it("returns 5 for higher qualification", () => {
      expect(scoreEducationMatch("MCA", "BCA")).toBe(5);
    });

    it("returns 0 for lower qualification", () => {
      expect(scoreEducationMatch("10th", "Bachelor")).toBe(0);
    });

    it("returns 5 when minEducation is missing", () => {
      expect(scoreEducationMatch("BCA", null)).toBe(5);
    });
  });

  describe("scoreJob", () => {
    const candidate = {
      currentTitle: "Software Engineer",
      preferredRoles: ["Full Stack Developer"],
      preferredLocations: ["Panipat"],
      skills: ["Node.js", "React", "MongoDB"],
      expectedSalary: "5 LPA",
      education: "BCA",
    };

    it("computes total score within bounds", () => {
      const job = {
        title: "Software Engineer",
        location: "Panipat",
        skills: ["Node.js", "React"],
        salaryMin: 300000,
        salaryMax: 800000,
        minimumEducation: "BCA",
      };
      const score = scoreJob(candidate, job);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("returns 0 for no match", () => {
      const job = {
        title: "Astronaut",
        location: "Mars",
        skills: ["Rocket Science"],
        salaryMin: 10000000,
        salaryMax: 20000000,
      };
      const score = scoreJob(candidate, job);
      expect(score).toBeLessThan(30);
    });

    it("caps score at 100", () => {
      const job = {
        title: "Software Engineer",
        location: "Panipat",
        skills: ["Node.js", "React", "MongoDB", "Express", "AWS"],
        salaryMin: 300000,
        salaryMax: 800000,
        minimumEducation: "BCA",
        createdAt: new Date(),
      };
      const score = scoreJob(candidate, job);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
