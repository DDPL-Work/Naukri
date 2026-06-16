const logger = require("../../config/logger");

class TemplateValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TemplateValidationError";
    this.templateName = options.templateName || null;
    this.missingPlaceholders = options.missingPlaceholders || [];
    this.extraVariables = options.extraVariables || [];
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);

    logger.error(`[TemplateValidationError] ${message}`, {
      templateName: this.templateName,
      missingPlaceholders: this.missingPlaceholders,
      extraVariables: this.extraVariables,
    });
  }

  toJSON() {
    return {
      error: true,
      name: this.name,
      message: this.message,
      templateName: this.templateName,
      missingPlaceholders: this.missingPlaceholders,
      extraVariables: this.extraVariables,
      timestamp: this.timestamp,
    };
  }
}

module.exports = TemplateValidationError;
