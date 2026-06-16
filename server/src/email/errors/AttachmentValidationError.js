const logger = require("../../config/logger");

class AttachmentValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AttachmentValidationError";
    this.filename = options.filename || null;
    this.contentType = options.contentType || null;
    this.size = options.size || null;
    this.maxSize = options.maxSize || null;
    this.allowedTypes = options.allowedTypes || [];
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);

    logger.error(`[AttachmentValidationError] ${message}`, {
      filename: this.filename,
      contentType: this.contentType,
      size: this.size,
    });
  }

  toJSON() {
    return {
      error: true,
      name: this.name,
      message: this.message,
      filename: this.filename,
      contentType: this.contentType,
      size: this.size,
    };
  }
}

module.exports = AttachmentValidationError;
