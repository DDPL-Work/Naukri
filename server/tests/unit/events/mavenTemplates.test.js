const {
  buildWelcomeHtml,
  buildOtpHtml,
  buildPasswordResetHtml,
  buildSecurityAlertHtml,
  buildApplicationConfirmationHtml,
  buildShortlistedHtml,
  buildRejectedHtml,
  buildInterviewScheduledHtml,
  buildInterviewRescheduledHtml,
  buildOfferIssuedHtml,
  buildOfferAcceptedRecruiterHtml,
  buildRecruiterWelcomeHtml,
  buildNewApplicationReceivedHtml,
  buildJobPostedHtml,
} = require("../../../src/email/templates/mavenTemplates");

describe("Maven Email Templates", () => {
  describe("buildWelcomeHtml", () => {
    test("returns HTML with user name", () => {
      const html = buildWelcomeHtml({ fullName: "Alice" });
      expect(html).toContain("Alice");
      expect(html).toContain("Welcome to Maven Jobs");
      expect(html).toContain("Maven Jobs");
    });

    test("handles missing name", () => {
      const html = buildWelcomeHtml({});
      expect(html).toContain("there");
    });
  });

  describe("buildOtpHtml", () => {
    test("returns HTML with OTP code", () => {
      const html = buildOtpHtml({ fullName: "Bob", otp: "482916", purpose: "verification" });
      expect(html).toContain("482916");
      expect(html).toContain("Bob");
      expect(html).toContain("Verify Your Email");
    });

    test("login purpose shows different subtitle", () => {
      const html = buildOtpHtml({ otp: "654321", purpose: "login" });
      expect(html).toContain("Your Login Verification Code");
      expect(html).toContain("5 minutes");
    });

    test("verification purpose shows 10 minutes expiry", () => {
      const html = buildOtpHtml({ otp: "123456", purpose: "verification" });
      expect(html).toContain("10 minutes");
    });
  });

  describe("buildPasswordResetHtml", () => {
    test("includes reset link", () => {
      const html = buildPasswordResetHtml({ fullName: "Charlie", resetLink: "https://example.com/reset/abc" });
      expect(html).toContain("Charlie");
      expect(html).toContain("https://example.com/reset/abc");
      expect(html).toContain("30 minutes");
    });

    test("handles missing reset link", () => {
      const html = buildPasswordResetHtml({ fullName: "Charlie" });
      expect(html).toContain("could not be generated");
    });
  });

  describe("buildSecurityAlertHtml", () => {
    test("includes timestamp and IP", () => {
      const html = buildSecurityAlertHtml({ fullName: "Dave", timestamp: "2026-06-16T12:00:00Z", ipAddress: "203.0.113.1" });
      expect(html).toContain("Dave");
      expect(html).toContain("2026-06-16T12:00:00Z");
      expect(html).toContain("203.0.113.1");
    });
  });

  describe("buildApplicationConfirmationHtml", () => {
    test("includes job and company details", () => {
      const html = buildApplicationConfirmationHtml({ fullName: "Eve", jobTitle: "Developer", companyName: "Startup Inc" });
      expect(html).toContain("Eve");
      expect(html).toContain("Developer");
      expect(html).toContain("Startup Inc");
    });
  });

  describe("buildShortlistedHtml", () => {
    test("includes congratulations messaging", () => {
      const html = buildShortlistedHtml({ fullName: "Frank", jobTitle: "Manager", companyName: "Big Co" });
      expect(html).toContain("Frank");
      expect(html).toContain("Manager");
      expect(html).toContain("Big Co");
      expect(html).toContain("Shortlisted");
    });
  });

  describe("buildRejectedHtml", () => {
    test("includes polite rejection messaging", () => {
      const html = buildRejectedHtml({ fullName: "Grace", jobTitle: "Analyst", companyName: "Finance Ltd" });
      expect(html).toContain("Grace");
      expect(html).toContain("Analyst");
      expect(html).toContain("Finance Ltd");
      expect(html).toContain("move forward");
    });
  });

  describe("buildInterviewScheduledHtml", () => {
    test("includes all interview details", () => {
      const html = buildInterviewScheduledHtml({
        fullName: "Heidi",
        jobTitle: "Engineer",
        companyName: "Tech Inc",
        interviewDate: "2026-07-10",
        interviewTime: "2:00 PM",
        interviewMode: "Video Call",
        interviewLink: "https://zoom.us/j/123",
      });
      expect(html).toContain("Heidi");
      expect(html).toContain("Engineer");
      expect(html).toContain("2026-07-10");
      expect(html).toContain("2:00 PM");
      expect(html).toContain("Video Call");
      expect(html).toContain("https://zoom.us/j/123");
    });
  });

  describe("buildInterviewRescheduledHtml", () => {
    test("shows updated interview details", () => {
      const html = buildInterviewRescheduledHtml({
        fullName: "Ivan",
        jobTitle: "Designer",
        companyName: "Creative Inc",
        interviewDate: "2026-07-15",
        interviewTime: "11:00 AM",
      });
      expect(html).toContain("Updated");
      expect(html).toContain("Ivan");
      expect(html).toContain("2026-07-15");
    });
  });

  describe("buildOfferIssuedHtml", () => {
    test("includes congratulations and offer link", () => {
      const html = buildOfferIssuedHtml({
        fullName: "Judy",
        companyName: "Corp",
        jobTitle: "CTO",
        offerLink: "https://offers.example.com/123",
      });
      expect(html).toContain("Congratulations");
      expect(html).toContain("Judy");
      expect(html).toContain("Corp");
      expect(html).toContain("CTO");
      expect(html).toContain("https://offers.example.com/123");
    });
  });

  describe("buildOfferAcceptedRecruiterHtml", () => {
    test("notifies recruiter of acceptance", () => {
      const html = buildOfferAcceptedRecruiterHtml({ candidateName: "Judy", jobTitle: "CTO" });
      expect(html).toContain("Offer Accepted");
      expect(html).toContain("Judy");
      expect(html).toContain("CTO");
    });
  });

  describe("buildRecruiterWelcomeHtml", () => {
    test("welcomes recruiter", () => {
      const html = buildRecruiterWelcomeHtml({ fullName: "Recruiter Bob" });
      expect(html).toContain("Recruiter Bob");
      expect(html).toContain("recruiter account");
    });
  });

  describe("buildNewApplicationReceivedHtml", () => {
    test("notifies recruiter of new application", () => {
      const html = buildNewApplicationReceivedHtml({ candidateName: "Alice", jobTitle: "Engineer" });
      expect(html).toContain("Alice");
      expect(html).toContain("Engineer");
      expect(html).toContain("New Application");
    });
  });

  describe("buildJobPostedHtml", () => {
    test("confirms job posting", () => {
      const html = buildJobPostedHtml({ jobTitle: "Senior Developer" });
      expect(html).toContain("Senior Developer");
      expect(html).toContain("now live");
    });
  });

  test("all templates produce valid HTML", () => {
    const templates = [
      buildWelcomeHtml({ fullName: "A" }),
      buildOtpHtml({ otp: "123", purpose: "login" }),
      buildPasswordResetHtml({ fullName: "B", resetLink: "https://x.com" }),
      buildSecurityAlertHtml({ fullName: "C", timestamp: "now", ipAddress: "1.2.3.4" }),
      buildApplicationConfirmationHtml({ fullName: "D", jobTitle: "E", companyName: "F" }),
      buildShortlistedHtml({ fullName: "G", jobTitle: "H", companyName: "I" }),
      buildRejectedHtml({ fullName: "J", jobTitle: "K", companyName: "L" }),
      buildInterviewScheduledHtml({ fullName: "M", jobTitle: "N", companyName: "O" }),
      buildInterviewRescheduledHtml({ fullName: "P", jobTitle: "Q", companyName: "R" }),
      buildOfferIssuedHtml({ fullName: "S", companyName: "T", jobTitle: "U" }),
      buildOfferAcceptedRecruiterHtml({ candidateName: "V", jobTitle: "W" }),
      buildRecruiterWelcomeHtml({ fullName: "X" }),
      buildNewApplicationReceivedHtml({ candidateName: "Y", jobTitle: "Z" }),
      buildJobPostedHtml({ jobTitle: "AA" }),
    ];

    templates.forEach((html, i) => {
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Maven Jobs");
      expect(html).toContain("</html>");
    });
    expect(templates.length).toBe(14);
  });
});
