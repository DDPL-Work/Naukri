const logger = require("../../config/logger");
const EmailDeliveryError = require("../errors/EmailDeliveryError");
const {
  buildWelcomeHtml,
  buildPasswordResetHtml,
  buildOTPHtml,
  buildJobApplicationConfirmationHtml,
} = require("../templates/layouts");

class EmailService {
  constructor(provider) {
    if (!provider || typeof provider.sendEmail !== "function") {
      throw new EmailDeliveryError(
        "A valid EmailProvider instance is required",
        { code: EmailDeliveryError.CODES.CONFIGURATION_ERROR }
      );
    }
    this._provider = provider;
  }

  getProvider() {
    return this._provider;
  }

  async sendEmail(options) {
    const { to, subject, html, text, attachments, from, onRetry } = options;

    if (!to) {
      throw new EmailDeliveryError(
        "Recipient email (to) is required",
        { code: EmailDeliveryError.CODES.VALIDATION_ERROR }
      );
    }

    if (!subject) {
      throw new EmailDeliveryError(
        "Email subject is required",
        { code: EmailDeliveryError.CODES.VALIDATION_ERROR, recipient: to }
      );
    }

    if (!html && !text) {
      throw new EmailDeliveryError(
        "Email body (html or text) is required",
        { code: EmailDeliveryError.CODES.VALIDATION_ERROR, recipient: to }
      );
    }

    logger.info("[email:service] Sending email", {
      to: Array.isArray(to) ? to : [to],
      subject,
      hasHtml: Boolean(html),
      hasText: Boolean(text),
      hasAttachments: Boolean(attachments?.length),
    });

    try {
      const result = await this._provider.sendEmail({
        to,
        subject,
        html,
        text,
        attachments,
        from,
        onRetry,
      });

      logger.info("[email:service] Email delivered", {
        to: Array.isArray(to) ? to : [to],
        subject,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        throw error;
      }

      throw new EmailDeliveryError(
        `Failed to send email: ${error.message}`,
        {
          code: EmailDeliveryError.CODES.TRANSPORT_ERROR,
          cause: error,
          recipient: Array.isArray(to) ? to.join(", ") : to,
          subject,
        }
      );
    }
  }

  async sendWelcomeEmail({ to, name }) {
    const displayName = String(name || "").trim() || "there";
    const html = buildWelcomeHtml({ name });
    const text = [
      `Welcome to ${process.env.APP_NAME || "Maven CRM QR"}`,
      "",
      `Hi ${displayName},`,
      "",
      "Your account has been created successfully. You can now explore job opportunities,",
      "track your applications, and stay connected with hiring companies.",
      "",
      `Sign in: ${process.env.CANDIDATE_WEB_URL || process.env.FRONTEND_URL || ""}/login`,
      "",
      "Best regards,",
      `The ${process.env.APP_NAME || "Maven CRM QR"} Team`,
    ].join("\n");

    return this.sendEmail({
      to,
      subject: `Welcome to ${process.env.APP_NAME || "Maven CRM QR"} — your account is ready`,
      html,
      text,
    });
  }

  async sendPasswordResetEmail({ to, name, resetLink }) {
    const displayName = String(name || "").trim() || "there";
    const html = buildPasswordResetHtml({ name, resetLink });
    const text = [
      `Reset your ${process.env.APP_NAME || "Maven CRM QR"} password`,
      "",
      `Hi ${displayName},`,
      "",
      "We received a request to reset the password for your account.",
      "Click the following link to set a new password (expires in 1 hour):",
      resetLink || "N/A",
      "",
      "If you did not request this, please ignore this email.",
      "",
      "Best regards,",
      `The ${process.env.APP_NAME || "Maven CRM QR"} Team`,
    ].join("\n");

    return this.sendEmail({
      to,
      subject: `Reset your ${process.env.APP_NAME || "Maven CRM QR"} password`,
      html,
      text,
    });
  }

  async sendOTPEmail({ to, name, otp }) {
    const displayName = String(name || "").trim() || "there";
    const html = buildOTPHtml({ name, otp });
    const text = [
      "Your OTP code",
      "",
      `Hi ${displayName},`,
      "",
      `Your one-time password is: ${otp}`,
      "This code is valid for 10 minutes.",
      "",
      "If you did not request this code, you can safely ignore this email.",
      "",
      "Best regards,",
      `The ${process.env.APP_NAME || "Maven CRM QR"} Team`,
    ].join("\n");

    return this.sendEmail({
      to,
      subject: `Your OTP code — ${process.env.APP_NAME || "Maven CRM QR"}`,
      html,
      text,
    });
  }

  async sendJobApplicationConfirmation({ to, name, jobTitle, companyName }) {
    const displayName = String(name || "").trim() || "there";
    const role = String(jobTitle || "a position").trim();
    const company = String(companyName || "the company").trim();
    const html = buildJobApplicationConfirmationHtml({ name, jobTitle, companyName });
    const text = [
      "Application submitted",
      "",
      `Hi ${displayName},`,
      "",
      `Your application for ${role} at ${company} has been submitted successfully.`,
      "The hiring team will review your profile and reach out if there is a match.",
      "",
      `Track your application: ${process.env.CANDIDATE_WEB_URL || ""}/candidate/applications`,
      "",
      "Best regards,",
      `The ${process.env.APP_NAME || "Maven CRM QR"} Team`,
    ].join("\n");

    return this.sendEmail({
      to,
      subject: `Application submitted — ${role} at ${company}`,
      html,
      text,
    });
  }

  async verifyConnection() {
    if (typeof this._provider.verifyConnection === "function") {
      return this._provider.verifyConnection();
    }
    throw new EmailDeliveryError(
      "Provider does not support connection verification",
      { code: EmailDeliveryError.CODES.TRANSPORT_ERROR }
    );
  }

  close() {
    if (typeof this._provider.close === "function") {
      this._provider.close();
    }
  }
}

module.exports = EmailService;
