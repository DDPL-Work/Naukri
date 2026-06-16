const emailModule = require("../email");

const logger = require("../config/logger");

const APP_NAME = process.env.APP_NAME || "Maven CRM QR";
const APP_URL = process.env.CANDIDATE_WEB_URL || process.env.FRONTEND_URL || "";

async function sendEmail({ to, subject, html, text = "" }) {
  try {
    const result = await emailModule.sendEmail({ to, subject, html, text });

    logger.info("[email:legacy] Sent successfully", {
      to,
      subject,
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const safeMessage = process.env.NODE_ENV === "production"
      ? "Failed to send email"
      : error.message;

    logger.warn("[email:legacy] Send failed", {
      to,
      subject,
      error: safeMessage,
    });

    return {
      success: false,
      error: safeMessage,
    };
  }
}

async function sendWelcomeEmail({ to, name }) {
  try {
    const result = await emailModule.sendWelcomeEmail({ to, name });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function sendPasswordResetEmail({ to, name, resetLink }) {
  try {
    const result = await emailModule.sendPasswordResetEmail({ to, name, resetLink });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function sendNotificationEmail({ to, name, notification }) {
  try {
    const html = buildNotificationHtml({ name, notification });
    const notifTitle = notification?.title || "New notification";
    const text = `${notifTitle}\n\nHi ${name || "there"},\n\n${notification?.message || ""}\n\nView details: ${notification?.actionUrl || "N/A"}\n\nBest regards,\nThe ${APP_NAME} Team`;

    const result = await emailModule.sendEmail({ to, subject: notifTitle, html, text });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function sendApplicationConfirmation({ to, name, jobTitle, companyName }) {
  try {
    const result = await emailModule.sendJobApplicationConfirmation({ to, name, jobTitle, companyName });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function buildNotificationHtml({ name, notification }) {
  const displayName = String(name || "").trim() || "there";
  const title = String(notification?.title || "New notification").trim();
  const message = String(notification?.message || "").trim();
  const actionUrl = String(notification?.actionUrl || "").trim();
  const category = String(notification?.category || "Update").trim();

  const wrapLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title></title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <tr>
                  <td style="padding:32px 32px 0 32px;background-color:#163060;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${APP_NAME}</h1>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#a0b4d6;">Transactional email service</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 32px 24px 32px;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                            You are receiving this email because you have an account with ${APP_NAME}.
                            If you did not expect this email, you can safely ignore it.
                          </p>
                          <p style="margin:8px 0 0 0;font-size:12px;color:#94a3b8;">
                            &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return wrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">${title}</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${displayName},</p>
    ${message ? `<p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">${message}</p>` : ""}
    <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;">Category: ${category}</p>
    ${actionUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#163060;border-radius:8px;padding:12px 28px;">
          <a href="${actionUrl}" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            View details
          </a>
        </td>
      </tr>
    </table>
    ` : ""}
    <p style="margin:20px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendApplicationConfirmation,
};
