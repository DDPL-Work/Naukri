const { normalizeSalary, isSalaryInRange } = require("../../../src/recommendations/utils/salaryNormalizer");

describe("salaryNormalizer", () => {
  describe("normalizeSalary", () => {
    it("handles null/undefined", () => {
      expect(normalizeSalary(null)).toBe(0);
      expect(normalizeSalary(undefined)).toBe(0);
    });

    it("returns number as-is", () => {
      expect(normalizeSalary(500000)).toBe(500000);
    });

    it("parses LPA format", () => {
      expect(normalizeSalary("5 LPA")).toBe(500000);
      expect(normalizeSalary("5.5 LPA")).toBe(550000);
    });

    it("parses lakh format", () => {
      expect(normalizeSalary("5 lakh")).toBe(500000);
      expect(normalizeSalary("5 lacs")).toBe(500000);
      expect(normalizeSalary("5 lac")).toBe(500000);
    });

    it("parses K format", () => {
      expect(normalizeSalary("500K")).toBe(500000);
      expect(normalizeSalary("50k")).toBe(50000);
    });

    it("parses PM (per month) format", () => {
      expect(normalizeSalary("50K PM")).toBe(600000);
      expect(normalizeSalary("25k pm")).toBe(300000);
    });

    it("parses range format", () => {
      expect(normalizeSalary("4-6 LPA")).toBe(500000);
      expect(normalizeSalary("4–6 LPA")).toBe(500000);
    });

    it("handles rupee symbol", () => {
      expect(normalizeSalary("₹5 LPA")).toBe(500000);
      expect(normalizeSalary("₹4–6 LPA")).toBe(500000);
    });

    it("returns 0 for unparseable strings", () => {
      expect(normalizeSalary("negotiable")).toBe(0);
      expect(normalizeSalary("")).toBe(0);
      expect(normalizeSalary("abc")).toBe(0);
    });
  });

  describe("isSalaryInRange", () => {
    it("returns 10 when salary is within range", () => {
      expect(isSalaryInRange("5 LPA", 300000, 800000)).toBe(10);
    });

    it("returns 5 when salary is within 20% tolerance", () => {
      expect(isSalaryInRange("10 LPA", 1200000, 1500000)).toBe(5);
    });

    it("returns 0 when salary is far outside range", () => {
      expect(isSalaryInRange("20 LPA", 300000, 500000)).toBe(0);
    });

    it("handles missing bounds", () => {
      expect(isSalaryInRange("5 LPA", null, null)).toBe(10);
    });
  });
});
