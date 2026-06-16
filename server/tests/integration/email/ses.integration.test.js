const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const SesEmailProvider = require("../../../src/email/providers/sesProvider");

const hasLiveAwsConfig = () => {
  return Boolean(
    process.env.AWS_REGION &&
    process.env.EMAIL_FROM &&
    process.env.AWS_ACCESS_KEY_ID
  );
};

describe("SES Integration", () => {
  beforeAll(() => {
    if (!hasLiveAwsConfig()) {
      console.warn(
        "Live AWS credentials not configured. Skipping live SES integration tests.\n" +
        "Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and EMAIL_FROM."
      );
    }
  });

  describe("Mocked SES", () => {
    let originalRegion;
    let originalFrom;

    beforeAll(() => {
      originalRegion = process.env.AWS_REGION;
      originalFrom = process.env.EMAIL_FROM;
      if (!hasLiveAwsConfig()) {
        process.env.AWS_REGION = "ap-south-1";
        process.env.EMAIL_FROM = "test@example.com";
      }
    });

    afterAll(() => {
      if (originalRegion) {
        process.env.AWS_REGION = originalRegion;
      } else {
        delete process.env.AWS_REGION;
      }
      if (originalFrom) {
        process.env.EMAIL_FROM = originalFrom;
      } else {
        delete process.env.EMAIL_FROM;
      }
    });

    test("sends email through mocked SES client", async () => {
      const mockSend = jest.fn().mockResolvedValue({
        MessageId: "mock-msg-integration",
        $metadata: { httpStatusCode: 200 },
      });

      jest.spyOn(SESClient.prototype, "send").mockImplementation(mockSend);

      const provider = new SesEmailProvider();
      const result = await provider.sendEmail({
        to: "recipient@example.com",
        subject: "Integration Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("mock-msg-integration");
      expect(result.provider).toBe("ses");
    });
  });

  describe("Verify SES identity", () => {
    test("checks sender identity verification status", async () => {
      if (!hasLiveAwsConfig()) {
        return;
      }

      const provider = new SesEmailProvider();
      const identities = await provider.verifyIdentity();

      expect(identities).toBeDefined();
    }, 15000);
  });
});
