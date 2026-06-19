const { generateUnsubscribeToken, verifyUnsubscribeToken, TOKEN_EXPIRY_HOURS } = require("../../../src/recommendations/utils/unsubscribeToken");

describe("unsubscribeToken", () => {
  it("generates a valid token", () => {
    const { token, payload } = generateUnsubscribeToken("user123", "test@example.com", "recommendations");
    expect(token).toBeTruthy();
    expect(token).toContain(":");
    expect(payload.userId).toBe("user123");
    expect(payload.email).toBe("test@example.com");
    expect(payload.purpose).toBe("recommendations");
    expect(payload.expiresAt).toBeGreaterThan(Date.now());
  });

  it("verifies a valid token", () => {
    const { token } = generateUnsubscribeToken("user456", "test2@example.com", "marketing");
    const payload = verifyUnsubscribeToken(token);
    expect(payload).toBeTruthy();
    expect(payload.userId).toBe("user456");
    expect(payload.email).toBe("test2@example.com");
    expect(payload.purpose).toBe("marketing");
  });

  it("returns null for malformed token", () => {
    const payload = verifyUnsubscribeToken("invalid-token-format");
    expect(payload).toBeNull();
  });

  it("returns null for garbage token", () => {
    const payload = verifyUnsubscribeToken("garbage:token:here");
    expect(payload).toBeNull();
  });

  it("returns null for expired token", () => {
    const originalNow = Date.now;
    const fakePast = Date.now() - (TOKEN_EXPIRY_HOURS + 1) * 3600000;
    global.Date.now = () => fakePast;

    const { token } = generateUnsubscribeToken("user789", "test3@example.com", "recommendations");

    global.Date.now = originalNow;

    const extendedPast = fakePast + (TOKEN_EXPIRY_HOURS + 2) * 3600000;
    global.Date.now = () => extendedPast;

    const payload = verifyUnsubscribeToken(token);
    expect(payload).toBeNull();

    global.Date.now = originalNow;
  });

  it("generates different tokens for same input", () => {
    const t1 = generateUnsubscribeToken("user1", "a@b.com", "recommendations");
    const t2 = generateUnsubscribeToken("user1", "a@b.com", "recommendations");
    expect(t1.token).not.toBe(t2.token);
  });

  it("generates token with TOKEN_EXPIRY_HOURS expiry", () => {
    const { payload } = generateUnsubscribeToken("user", "e@mail.com", "recommendations");
    const expectedExpiry = Date.now() + TOKEN_EXPIRY_HOURS * 3600000;
    expect(payload.expiresAt).toBeCloseTo(expectedExpiry, -3);
  });
});
