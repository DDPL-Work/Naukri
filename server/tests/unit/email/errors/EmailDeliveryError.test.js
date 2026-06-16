const EmailDeliveryError = require("../../../../src/email/errors/EmailDeliveryError");

describe("EmailDeliveryError", () => {
  test("creates error with default values", () => {
    const error = new EmailDeliveryError("Something went wrong");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(error.name).toBe("EmailDeliveryError");
    expect(error.code).toBe("EMAIL_DELIVERY_ERROR");
    expect(error.message).toBe("Something went wrong");
    expect(error.timestamp).toBeDefined();
    expect(error.cause).toBeNull();
  });

  test("accepts custom code", () => {
    const error = new EmailDeliveryError("Config error", {
      code: EmailDeliveryError.CODES.CONFIGURATION_ERROR,
    });

    expect(error.code).toBe("EMAIL_CONFIG_ERROR");
  });

  test("accepts cause", () => {
    const cause = new Error("Original error");
    const error = new EmailDeliveryError("Wrapped", { cause });

    expect(error.cause).toBe(cause);
  });

  test("accepts recipient and subject", () => {
    const error = new EmailDeliveryError("Failed", {
      recipient: "user@example.com",
      subject: "Test",
    });

    expect(error.recipient).toBe("user@example.com");
    expect(error.subject).toBe("Test");
  });

  test("masks email in logs via helper", () => {
    const error = new EmailDeliveryError("Test", {
      recipient: "johndoe@example.com",
    });

    expect(error.recipient).toBe("johndoe@example.com");
  });

  test("toJSON returns safe object", () => {
    const error = new EmailDeliveryError("Error message", {
      code: "EMAIL_TEST_ERROR",
    });

    const json = error.toJSON();

    expect(json).toEqual({
      error: true,
      name: "EmailDeliveryError",
      code: "EMAIL_TEST_ERROR",
      message: "Error message",
      timestamp: expect.any(String),
    });

    expect(json.recipient).toBeUndefined();
    expect(json.cause).toBeUndefined();
  });
});
