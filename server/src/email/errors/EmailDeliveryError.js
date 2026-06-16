const logger = require("../../config/logger");

class EmailDeliveryError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = options.code || "EMAIL_DELIVERY_ERROR";
    this.cause = options.cause || null;
    this.recipient = options.recipient || null;
    this.subject = options.subject || null;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);

    logger.error(`[EmailDeliveryError] ${this.code}: ${message}`, {
      code: this.code,
      recipient: this.recipient ? this._maskEmail(this.recipient) : null,
      subject: this.subject,
      timestamp: this.timestamp,
    });
  }

  _maskEmail(email) {
    if (!email || !email.includes("@")) return email;
    const [local, domain] = email.split("@");
    const masked = local.length > 2
      ? local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
      : local[0] + "*";
    return `${masked}@${domain}`;
  }

  toJSON() {
    return {
      error: true,
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
    };
  }
}

EmailDeliveryError.CODES = {
  CONFIGURATION_ERROR: "EMAIL_CONFIG_ERROR",
  VALIDATION_ERROR: "EMAIL_VALIDATION_ERROR",
  TRANSPORT_ERROR: "EMAIL_TRANSPORT_ERROR",
  THROTTLING_ERROR: "EMAIL_THROTTLING_ERROR",
  TEMPORARY_FAILURE: "EMAIL_TEMPORARY_FAILURE",
  PERMANENT_FAILURE: "EMAIL_PERMANENT_FAILURE",
  RATE_LIMIT_ERROR: "EMAIL_RATE_LIMIT_ERROR",
  CIRCUIT_OPEN_ERROR: "EMAIL_CIRCUIT_OPEN_ERROR",
  ATTACHMENT_ERROR: "EMAIL_ATTACHMENT_ERROR",
  TEMPLATE_ERROR: "EMAIL_TEMPLATE_ERROR",
};

module.exports = EmailDeliveryError;
