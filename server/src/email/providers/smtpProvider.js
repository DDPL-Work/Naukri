const nodemailer = require("nodemailer");
const EmailProvider = require("./emailProvider");
const EmailDeliveryError = require("../errors/EmailDeliveryError");
const { withRetry } = require("../utils/retry");
const logger = require("../../config/logger");

class SmtpEmailProvider extends EmailProvider {
  constructor(options = {}) {
    super();
    this._transporter = null;
    this._config = this._resolveConfig(options);
  }

  _resolveConfig(options) {
    const host = options.host || process.env.SMTP_HOST;
    const port = parseInt(options.port || process.env.SMTP_PORT || "587", 10);
    const user = options.user || process.env.SMTP_USER;
    const pass = options.pass || process.env.SMTP_PASS;
    const from = options.from || process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL;

    if (!host || !user || !pass) {
      throw new EmailDeliveryError(
        "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.",
        { code: EmailDeliveryError.CODES.CONFIGURATION_ERROR }
      );
    }

    return { host, port, user, pass, from };
  }

  _getTransporter() {
    if (!this._transporter) {
      const { host, port, user, pass } = this._config;

      logger.info("[email:smtp] Creating SMTP transport with connection pooling", {
        host,
        port,
        pool: true,
      });

      this._transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
        socketTimeout: 10000,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
      });
    }

    return this._transporter;
  }

  async sendEmail(options) {
    const { to, subject, html, text, attachments, from: overrideFrom } = options;

    if (!to || !subject) {
      throw new EmailDeliveryError(
        "Recipient (to) and subject are required",
        { code: EmailDeliveryError.CODES.VALIDATION_ERROR, recipient: to, subject }
      );
    }

    const fromAddress = overrideFrom || this._config.from;
    const transporter = this._getTransporter();

    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text: text || "",
      html: html || "",
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        cid: att.cid,
      }));
    }

    const retryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      operation: `SMTP email to ${Array.isArray(to) ? to.join(", ") : to}`,
      onRetry: options.onRetry || null,
    };

    try {
      return await withRetry(
        async (attempt) => {
          logger.debug("[email:smtp] Sending email", {
            to: Array.isArray(to) ? to : [to],
            subject,
            hasHtml: Boolean(html),
            hasText: Boolean(text),
            hasAttachments: Boolean(attachments?.length),
            attempt,
          });

          const info = await transporter.sendMail(mailOptions);

          logger.info("[email:smtp] Sent successfully", {
            to: Array.isArray(to) ? to : [to],
            subject,
            messageId: info.messageId,
            response: info.response,
            attempt,
          });

          return {
            success: true,
            messageId: info.messageId,
            provider: "smtp",
            response: info.response,
          };
        },
        retryOptions
      );
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        throw error;
      }

      throw new EmailDeliveryError(
        `SMTP send failed after retries: ${error.message}`,
        {
          code: EmailDeliveryError.CODES.TRANSPORT_ERROR,
          cause: error,
          recipient: Array.isArray(to) ? to.join(", ") : to,
          subject,
        }
      );
    }
  }

  async verifyConnection() {
    try {
      const transporter = this._getTransporter();
      const success = await transporter.verify();
      logger.info("[email:smtp] Connection verified successfully");
      return success;
    } catch (error) {
      logger.error("[email:smtp] Connection verification failed", {
        error: error.message,
      });
      throw new EmailDeliveryError(
        `SMTP connection verification failed: ${error.message}`,
        { code: EmailDeliveryError.CODES.TRANSPORT_ERROR, cause: error }
      );
    }
  }

  close() {
    if (this._transporter) {
      this._transporter.close();
      this._transporter = null;
      logger.info("[email:smtp] Transport closed");
    }
  }
}

module.exports = SmtpEmailProvider;
