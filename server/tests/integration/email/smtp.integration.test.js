const SmtpEmailProvider = require("../../../src/email/providers/smtpProvider");

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

describe("SMTP Integration", () => {
  let provider;

  beforeAll(() => {
    if (!hasSmtpConfig()) {
      console.warn(
        "SMTP credentials not configured. Skipping SMTP integration tests.\n" +
        "Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM environment variables."
      );
    }
  });

  beforeEach(() => {
    provider = null;
  });

  test("connects to SMTP server and verifies transport", async () => {
    if (!hasSmtpConfig()) {
      return;
    }

    provider = new SmtpEmailProvider();
    const result = await provider.verifyConnection();

    expect(result).toBe(true);
  }, 15000);

  test("sends a test email via SMTP", async () => {
    if (!hasSmtpConfig()) {
      return;
    }

    const testRecipient = process.env.TEST_EMAIL_RECIPIENT || process.env.EMAIL_FROM;

    if (!testRecipient) {
      console.warn("TEST_EMAIL_RECIPIENT not set. Skipping actual send.");
      return;
    }

    provider = new SmtpEmailProvider();
    const result = await provider.sendEmail({
      to: testRecipient,
      subject: "[Integration Test] SMTP Email",
      html: "<h1>Test</h1><p>This is an integration test from the email module.</p>",
      text: "Integration test email.",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe("smtp");
  }, 30000);
});
