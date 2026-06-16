const APP_NAME = process.env.APP_NAME || "Maven CRM QR";
const APP_URL = process.env.CANDIDATE_WEB_URL || process.env.FRONTEND_URL || "";

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

const buildWelcomeHtml = ({ name }) => {
  const displayName = String(name || "").trim() || "there";

  return wrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Welcome to ${APP_NAME}</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${displayName},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your account has been created successfully. You can now explore job opportunities,
      track your applications, and stay connected with hiring companies — all from your personalised dashboard.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#163060;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/login" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Sign in to your account
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      If you have any questions, please reach out to our support team.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildPasswordResetHtml = ({ name, resetLink }) => {
  const displayName = String(name || "").trim() || "there";
  const link = String(resetLink || "").trim();

  return wrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Reset your password</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${displayName},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      We received a request to reset the password for your ${APP_NAME} account.
      Click the button below to set a new password. This link will expire in 1 hour.
    </p>
    ${link ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#163060;border-radius:8px;padding:12px 28px;">
          <a href="${link}" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">
      Or copy this link into your browser:<br />
      <a href="${link}" style="color:#163060;word-break:break-all;">${link}</a>
    </p>
    ` : `
    <p style="margin:16px 0 0 0;font-size:14px;color:#dc2626;font-weight:600;">
      A reset link could not be generated. Please request a new password reset.
    </p>
    `}
    <p style="margin:20px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      If you did not request a password reset, you can safely ignore this email.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildOTPHtml = ({ name, otp }) => {
  const displayName = String(name || "").trim() || "there";
  const code = String(otp || "").trim();

  return wrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Your OTP code</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${displayName},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Use the following one-time password to complete your action. This code is valid for 10 minutes.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td align="center" style="background-color:#f0f4ff;border-radius:8px;padding:20px 40px;border:2px dashed #163060;">
          <span style="font-size:36px;font-weight:700;color:#163060;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</span>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">
      If you did not request this code, you can safely ignore this email.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildJobApplicationConfirmationHtml = ({ name, jobTitle, companyName }) => {
  const displayName = String(name || "").trim() || "there";
  const role = String(jobTitle || "a position").trim();
  const company = String(companyName || "the company").trim();

  return wrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Application submitted</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${displayName},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your application for <strong>${role}</strong> at <strong>${company}</strong> has been submitted successfully.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0fdf4;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">&#10003; Application received</p>
          <p style="margin:4px 0 0 0;font-size:14px;color:#166534;">
            The hiring team will review your profile and reach out if there is a match.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      You can track the status of your application from your dashboard.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

module.exports = {
  wrapLayout,
  buildWelcomeHtml,
  buildPasswordResetHtml,
  buildOTPHtml,
  buildJobApplicationConfirmationHtml,
};
