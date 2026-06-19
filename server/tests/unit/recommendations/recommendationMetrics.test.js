const { metrics, increment, getMetrics, reset } = require("../../../src/recommendations/metrics/recommendationMetrics");

beforeEach(() => {
  reset();
});

describe("recommendationMetrics", () => {
  it("starts at zero", () => {
    const m = getMetrics();
    expect(m.recommendationsGenerated).toBe(0);
    expect(m.emailsSent).toBe(0);
    expect(m.emailFailures).toBe(0);
  });

  it("increments counters", () => {
    increment("recommendationsGenerated", 5);
    increment("emailsSent", 3);
    increment("emailFailures", 1);

    const m = getMetrics();
    expect(m.recommendationsGenerated).toBe(5);
    expect(m.emailsSent).toBe(3);
    expect(m.emailFailures).toBe(1);
  });

  it("computes CTR", () => {
    increment("clicks", 2);
    increment("emailsSent", 10);

    const m = getMetrics();
    expect(m.ctr).toBe("20.00");
  });

  it("returns 0 CTR when no emails sent", () => {
    increment("clicks", 5);
    const m = getMetrics();
    expect(m.ctr).toBe("0.00");
  });

  it("resets all counters", () => {
    increment("recommendationsGenerated", 10);
    reset();
    const m = getMetrics();
    expect(m.recommendationsGenerated).toBe(0);
  });
});
