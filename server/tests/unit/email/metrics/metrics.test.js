const metrics = require("../../../../src/email/metrics/metrics");

describe("Metrics", () => {
  beforeEach(() => {
    metrics.resetMetrics();
  });

  describe("incrementCounter", () => {
    test("increments existing counters", () => {
      metrics.incrementCounter("emailsSentTotal");
      expect(metrics.getCounterSnapshot().emailsSentTotal).toBe(1);

      metrics.incrementCounter("emailsSentTotal", 3);
      expect(metrics.getCounterSnapshot().emailsSentTotal).toBe(4);
    });

    test("ignores unknown counters", () => {
      metrics.incrementCounter("unknownCounter");
      expect(metrics.getCounterSnapshot().unknownCounter).toBeUndefined();
    });
  });

  describe("recordSendDuration", () => {
    test("records and averages durations", () => {
      metrics.recordSendDuration(100);
      metrics.recordSendDuration(200);
      metrics.recordSendDuration(300);

      expect(metrics.getAverageSendDuration()).toBe(200);
    });

    test("returns 0 with no samples", () => {
      expect(metrics.getAverageSendDuration()).toBe(0);
    });

    test("calculates p95", () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordSendDuration(i);
      }
      expect(metrics.getP95SendDuration()).toBe(95);
    });
  });

  describe("resetMetrics", () => {
    test("clears all counters and timings", () => {
      metrics.incrementCounter("emailsSentTotal", 10);
      metrics.recordSendDuration(100);

      metrics.resetMetrics();

      expect(metrics.getCounterSnapshot().emailsSentTotal).toBe(0);
      expect(metrics.getAverageSendDuration()).toBe(0);
    });
  });

  describe("generateJsonMetrics", () => {
    test("returns structured JSON", async () => {
      metrics.incrementCounter("emailsSentTotal", 5);
      metrics.incrementCounter("emailsFailedTotal", 1);
      metrics.recordSendDuration(150);

      const json = await metrics.generateJsonMetrics();

      expect(json.emails_sent_total).toBe(5);
      expect(json.emails_failed_total).toBe(1);
      expect(json.average_send_duration_ms).toBe(150);
    });
  });

  describe("generatePrometheusOutput", () => {
    test("generates prometheus-compatible text format", async () => {
      metrics.incrementCounter("emailsSentTotal", 3);

      const output = await metrics.generatePrometheusOutput();

      expect(output).toContain("# HELP email_emails_sent_total");
      expect(output).toContain("# TYPE email_emails_sent_total counter");
      expect(output).toContain("email_emails_sent_total{");
      expect(output).toContain("email_queue_depth{");
    });
  });
});
