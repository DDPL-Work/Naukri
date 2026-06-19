let skillNormalizer;
let normalizeSkill, getSkillCategory, getSkillCategories, scoreNormalizedSkillMatch;

function loadModule() {
  delete require.cache[require.resolve("../../../src/recommendations/utils/skillNormalizer")];
  jest.resetModules();
  skillNormalizer = require("../../../src/recommendations/utils/skillNormalizer");
  normalizeSkill = skillNormalizer.normalizeSkill;
  getSkillCategory = skillNormalizer.getSkillCategory;
  getSkillCategories = skillNormalizer.getSkillCategories;
  scoreNormalizedSkillMatch = skillNormalizer.scoreNormalizedSkillMatch;
}

describe("skillNormalizer", () => {
  beforeEach(() => {
    loadModule();
  });

  describe("normalizeSkill", () => {
    it("lowercases and trims", () => {
      expect(normalizeSkill("  Node.js  ")).toBe("node.js");
    });

    it("returns empty string for null", () => {
      expect(normalizeSkill(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(normalizeSkill(undefined)).toBe("");
    });
  });

  describe("getSkillCategory", () => {
    it("maps 'web dev' to frontend", () => {
      expect(getSkillCategory("web dev")).toBe("frontend");
    });

    it("maps 'web developer' to frontend", () => {
      expect(getSkillCategory("web developer")).toBe("frontend");
    });

    it("maps 'React' to frontend", () => {
      expect(getSkillCategory("React")).toBe("frontend");
    });

    it("maps 'Node.js' to backend", () => {
      expect(getSkillCategory("Node.js")).toBe("backend");
    });

    it("maps 'MERN' to fullstack", () => {
      expect(getSkillCategory("MERN")).toBe("fullstack");
    });

    it("maps 'MongoDB' to database", () => {
      expect(getSkillCategory("MongoDB")).toBe("database");
    });

    it("maps 'AWS' to devops", () => {
      expect(getSkillCategory("AWS")).toBe("devops");
    });

    it("maps 'Python' to backend", () => {
      expect(getSkillCategory("Python")).toBe("backend");
    });

    it("maps 'Machine Learning' to data", () => {
      expect(getSkillCategory("Machine Learning")).toBe("data");
    });

    it("returns null for unknown skill", () => {
      expect(getSkillCategory("haberdashery")).toBeNull();
    });
  });

  describe("getSkillCategories", () => {
    it("returns categories for multiple skills", () => {
      const cats = getSkillCategories(["Node.js", "React", "MongoDB"]);
      expect(cats.has("backend")).toBe(true);
      expect(cats.has("frontend")).toBe(true);
      expect(cats.has("database")).toBe(true);
    });

    it("returns empty set for empty input", () => {
      const cats = getSkillCategories([]);
      expect(cats.size).toBe(0);
    });

    it("deduplicates categories", () => {
      const cats = getSkillCategories(["React", "Angular", "Vue"]);
      expect(cats.size).toBe(1);
      expect(cats.has("frontend")).toBe(true);
    });
  });

  describe("scoreNormalizedSkillMatch", () => {
    it("returns 50 for same category skills", () => {
      const score = scoreNormalizedSkillMatch(
        ["Node.js", "React"],
        ["Node.js", "React"]
      );
      expect(score).toBe(50);
    });

    it("scores synonyms correctly", () => {
      const score = scoreNormalizedSkillMatch(
        ["Node.js", "React"],
        ["Node", "React"]
      );
      expect(score).toBe(43);
    });

    it("scores category overlap", () => {
      const score = scoreNormalizedSkillMatch(
        ["web dev", "React"],
        ["Node.js", "React"]
      );
      expect(score).toBeGreaterThanOrEqual(15);
    });

    it("returns 0 for empty candidate skills", () => {
      expect(scoreNormalizedSkillMatch([], ["Node.js"])).toBe(0);
    });

    it("returns 0 for empty job skills", () => {
      expect(scoreNormalizedSkillMatch(["Node.js"], [])).toBe(0);
    });

    it("returns partial for partial category overlap", () => {
      const score = scoreNormalizedSkillMatch(
        ["React", "Node.js"],
        ["React", "AWS", "Python"]
      );
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(50);
    });

    it("relates MERN stack to fullstack", () => {
      const cat = getSkillCategory("MERN");
      expect(cat).toBe("fullstack");
    });
  });
});
