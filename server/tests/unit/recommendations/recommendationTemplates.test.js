const { buildRecommendationEmail, escapeHtml } = require("../../../src/recommendations/templates/recommendationTemplates");

describe("recommendationTemplates", () => {
  const sampleJobs = [
    { title: "Software Engineer", companyName: "Tech Corp", location: "Panipat", salaryRange: "₹4–6 LPA", experience: "2-5 yrs", score: 95, applyUrl: "https://example.com/job1" },
    { title: "Backend Engineer", companyName: "Startup Inc", location: "Delhi", salaryRange: "₹5–7 LPA", experience: "3-6 yrs", score: 88, applyUrl: "https://example.com/job2" },
    { title: "Full Stack Developer", companyName: "WebCo", location: "Remote", salaryRange: "", experience: "", score: 82, applyUrl: "https://example.com/job3" },
  ];

  describe("buildRecommendationEmail", () => {
    it("generates PRO subject", () => {
      const { subject } = buildRecommendationEmail("Ashish", sampleJobs, "PRO");
      expect(subject).toContain("Top 3");
      expect(subject).toContain("🚀");
    });

    it("generates ELITE subject", () => {
      const { subject } = buildRecommendationEmail("Ashish", sampleJobs, "ELITE");
      expect(subject).toContain("Exclusive");
      expect(subject).toContain("⭐");
    });

    it("generates HTML with job cards", () => {
      const { html } = buildRecommendationEmail("Ashish", sampleJobs, "PRO");
      expect(html).toContain("Software Engineer");
      expect(html).toContain("Tech Corp");
      expect(html).toContain("Panipat");
      expect(html).toContain("Apply Now");
      expect(html).toContain("Explore More Jobs");
      expect(html).toContain("Maven Jobs");
    });

    it("includes candidate name in greeting", () => {
      const { html } = buildRecommendationEmail("Ashish", sampleJobs, "PRO");
      expect(html).toContain("Hi Ashish");
    });

    it("handles empty recommendations", () => {
      const { html, subject } = buildRecommendationEmail("Test", [], "PRO");
      expect(subject).toBeTruthy();
      expect(html).toContain("Hi Test");
    });

    it("includes preference management link", () => {
      const { html } = buildRecommendationEmail("Test", sampleJobs, "ELITE");
      expect(html).toContain("Manage preferences");
    });

    it("escapes HTML in job titles", () => {
      const jobs = [{ title: "<script>alert('xss')</script>", companyName: "Test", location: "Test", score: 50, applyUrl: "#" }];
      const { html } = buildRecommendationEmail("Test", jobs, "PRO");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("escapeHtml", () => {
    it("escapes special characters", () => {
      expect(escapeHtml('<script>"&')).toBe("&lt;script&gt;&quot;&amp;");
    });

    it("returns empty string for null/undefined", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });
});
