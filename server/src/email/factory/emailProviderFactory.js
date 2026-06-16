const SmtpEmailProvider = require("../providers/smtpProvider");
const SesEmailProvider = require("../providers/sesProvider");
const EmailDeliveryError = require("../errors/EmailDeliveryError");
const logger = require("../../config/logger");

class EmailProviderFactory {
  static createProvider(options = {}) {
    const env = (options.env || process.env.NODE_ENV || "development").toLowerCase();

    logger.info("[email:factory] Creating provider", {
      environment: env,
    });

    switch (env) {
      case "production": {
        logger.info("[email:factory] Using SES provider (production)");
        const providerOptions = {
          region: options.region,
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
          from: options.from,
        };
        return new SesEmailProvider(providerOptions);
      }

      case "development":
      case "test":
      case "staging": {
        logger.info(`[email:factory] Using SMTP provider (${env})`);
        const providerOptions = {
          host: options.host,
          port: options.port,
          user: options.user,
          pass: options.pass,
          from: options.from,
        };
        return new SmtpEmailProvider(providerOptions);
      }

      default: {
        logger.warn(`[email:factory] Unknown environment "${env}", falling back to SMTP`);
        return new SmtpEmailProvider({
          host: options.host,
          port: options.port,
          user: options.user,
          pass: options.pass,
          from: options.from,
        });
      }
    }
  }

  static createSmtpProvider(options = {}) {
    return new SmtpEmailProvider(options);
  }

  static createSesProvider(options = {}) {
    return new SesEmailProvider(options);
  }
}

module.exports = EmailProviderFactory;
