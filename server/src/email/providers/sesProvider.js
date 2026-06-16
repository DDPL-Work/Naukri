const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const EmailProvider = require("./emailProvider");
const EmailDeliveryError = require("../errors/EmailDeliveryError");
const { withRetry } = require("../utils/retry");
const logger = require("../../config/logger");

class SesEmailProvider extends EmailProvider {
  constructor(options = {}) {
    super();
    this._client = null;
    this._config = this._resolveConfig(options);
  }

  _resolveConfig(options) {
    const region = options.region || process.env.AWS_REGION || process.env.AWS_SES_REGION;
    const accessKeyId = options.accessKeyId || process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SES_SECRET_ACCESS_KEY;
    const from = options.from || process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL;

    if (!region) {
      throw new EmailDeliveryError(
        "AWS region is not configured. Set AWS_REGION environment variable.",
        { code: EmailDeliveryError.CODES.CONFIGURATION_ERROR }
      );
    }

    if (!from) {
      throw new EmailDeliveryError(
        "Sender email (EMAIL_FROM) is not configured.",
        { code: EmailDeliveryError.CODES.CONFIGURATION_ERROR }
      );
    }

    return { region, accessKeyId, secretAccessKey, from };
  }

  _getClient() {
    if (!this._client) {
      const { region, accessKeyId, secretAccessKey } = this._config;

      const clientConfig = {
        region,
        maxAttempts: 3,
      };

      if (accessKeyId && secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId,
          secretAccessKey,
        };
      }

      logger.info("[email:ses] Creating SES client", {
        region,
        hasCredentials: Boolean(accessKeyId && secretAccessKey),
        useDefaultCredentialChain: !(accessKeyId && secretAccessKey),
      });

      this._client = new SESClient(clientConfig);
    }

    return this._client;
  }

  async sendEmail(options) {
    const { to, subject, html, text, from: overrideFrom } = options;

    if (!to || !subject) {
      throw new EmailDeliveryError(
        "Recipient (to) and subject are required",
        { code: EmailDeliveryError.CODES.VALIDATION_ERROR, recipient: to, subject }
      );
    }

    const fromAddress = overrideFrom || this._config.from;
    const client = this._getClient();

    const destination = {
      ToAddresses: Array.isArray(to) ? to : [to],
    };

    const message = {
      Subject: {
        Charset: "UTF-8",
        Data: String(subject).trim(),
      },
      Body: {},
    };

    if (html) {
      message.Body.Html = {
        Charset: "UTF-8",
        Data: html,
      };
    }

    if (text) {
      message.Body.Text = {
        Charset: "UTF-8",
        Data: text,
      };
    }

    if (!html && !text) {
      throw new EmailDeliveryError(
        "Email body (html or text) is required",
        { code: EmailDeliveryError.CODES.VALIDATION_ERROR, recipient: to }
      );
    }

    const params = {
      Source: fromAddress,
      Destination: destination,
      Message: message,
    };

    const retryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      operation: `SES email to ${Array.isArray(to) ? to.join(", ") : to}`,
      onRetry: options.onRetry || null,
    };

    try {
      return await withRetry(
        async (attempt) => {
          logger.debug("[email:ses] Sending email", {
            to: Array.isArray(to) ? to : [to],
            subject,
            hasHtml: Boolean(html),
            hasText: Boolean(text),
            attempt,
          });

          const command = new SendEmailCommand(params);
          const response = await client.send(command);

          logger.info("[email:ses] Sent successfully", {
            to: Array.isArray(to) ? to : [to],
            subject,
            messageId: response.MessageId,
            attempt,
          });

          return {
            success: true,
            messageId: response.MessageId,
            provider: "ses",
          };
        },
        retryOptions
      );
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        throw error;
      }

      throw new EmailDeliveryError(
        `SES send failed after retries: ${error.message}`,
        {
          code: EmailDeliveryError.CODES.TRANSPORT_ERROR,
          cause: error,
          recipient: Array.isArray(to) ? to.join(", ") : to,
          subject,
        }
      );
    }
  }

  async verifyIdentity(email) {
    const client = this._getClient();
    const { GetIdentityVerificationAttributesCommand } = require("@aws-sdk/client-ses");

    try {
      const command = new GetIdentityVerificationAttributesCommand({
        Identities: [email || this._config.from],
      });
      const response = await client.send(command);
      return response.VerificationAttributes;
    } catch (error) {
      logger.error("[email:ses] Identity verification check failed", {
        email,
        error: error.message,
      });
      throw new EmailDeliveryError(
        `SES identity verification failed: ${error.message}`,
        { code: EmailDeliveryError.CODES.TRANSPORT_ERROR, cause: error }
      );
    }
  }

  close() {
    if (this._client) {
      this._client.destroy();
      this._client = null;
      logger.info("[email:ses] SES client destroyed");
    }
  }
}

module.exports = SesEmailProvider;
