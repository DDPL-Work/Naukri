const APP_NAME = "Maven Jobs";
const APP_URL = process.env.CANDIDATE_WEB_URL || process.env.FRONTEND_URL || "https://mavenjobs.com";

const mavenWrapLayout = (content) => `
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
                  <td style="padding:32px 32px 0 32px;background-color:#1a365d;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${APP_NAME}</h1>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#90b0d6;">Find your next opportunity</p>
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

const buildWelcomeHtml = ({ fullName }) => {
  const name = String(fullName || "").trim() || "there";
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Welcome to ${APP_NAME}</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Thank you for creating your account. You now have access to thousands of job opportunities
      from top companies. Here is what you can do next:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      <tr><td style="padding:6px 0;font-size:14px;color:#475569;">&#10003; Browse and apply to jobs</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#475569;">&#10003; Track your applications in real time</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#475569;">&#10003; Get notified when you are shortlisted</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#475569;">&#10003; Manage interview schedules</td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/login" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Complete your profile
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildOtpHtml = ({ fullName, otp, purpose }) => {
  const name = String(fullName || "").trim() || "there";
  const code = String(otp || "").trim();
  const subtitle = purpose === "login" ? "Your Login Verification Code" : "Verify Your Email";
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">${subtitle}</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      ${purpose === "login" ? "Use the code below to complete your login." : "Use the code below to verify your email address."}
      This code expires in ${purpose === "login" ? "5" : "10"} minutes.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td align="center" style="background-color:#f0f4ff;border-radius:8px;padding:20px 40px;border:2px dashed #1a365d;">
          <span style="font-size:36px;font-weight:700;color:#1a365d;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</span>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">
      If you did not request this code, you can safely ignore this email.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildPasswordResetHtml = ({ fullName, resetLink }) => {
  const name = String(fullName || "").trim() || "there";
  const link = String(resetLink || "").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Reset Your Password</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      We received a request to reset the password for your ${APP_NAME} account.
      Click the button below to set a new password. This link will expire in 30 minutes.
    </p>
    ${link ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${link}" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">
      Or copy this link into your browser:<br />
      <a href="${link}" style="color:#1a365d;word-break:break-all;">${link}</a>
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

const buildSecurityAlertHtml = ({ fullName, timestamp, ipAddress }) => {
  const name = String(fullName || "").trim() || "there";
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Your Password Was Changed</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your ${APP_NAME} account password was successfully changed.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Time:</strong> ${timestamp || "N/A"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>IP Address:</strong> ${ipAddress || "N/A"}</td></tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      If you did not make this change, please contact our support team immediately.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildApplicationConfirmationHtml = ({ fullName, jobTitle, companyName }) => {
  const name = String(fullName || "").trim() || "there";
  const role = String(jobTitle || "a position").trim();
  const company = String(companyName || "a company").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Application Received</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your application for <strong>${role}</strong> at <strong>${company}</strong> has been received successfully.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0fdf4;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">&#10003; Application submitted</p>
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

const buildShortlistedHtml = ({ fullName, jobTitle, companyName }) => {
  const name = String(fullName || "").trim() || "there";
  const role = String(jobTitle || "the position").trim();
  const company = String(companyName || "the company").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">You've Been Shortlisted</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Great news! Your application for <strong>${role}</strong> at <strong>${company}</strong>
      has been shortlisted.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#eff6ff;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">&#10003; Application shortlisted</p>
          <p style="margin:4px 0 0 0;font-size:14px;color:#1e40af;">
            The recruiter will reach out to schedule an interview soon.
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/applications" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            View application status
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildRejectedHtml = ({ fullName, jobTitle, companyName }) => {
  const name = String(fullName || "").trim() || "there";
  const role = String(jobTitle || "the position").trim();
  const company = String(companyName || "the company").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Application Status Update</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Thank you for your interest in the <strong>${role}</strong> position at <strong>${company}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#fef2f2;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">
            After careful consideration, we have decided to move forward with other candidates
            whose qualifications more closely match the requirements of this role.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      We encourage you to apply for other positions on ${APP_NAME} that match your skills and experience.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/jobs" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Browse more jobs
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildInterviewScheduledHtml = ({ fullName, jobTitle, companyName, interviewDate, interviewTime, interviewMode, interviewLink }) => {
  const name = String(fullName || "").trim() || "there";
  const role = String(jobTitle || "the position").trim();
  const company = String(companyName || "the company").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Interview Scheduled</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your interview for <strong>${role}</strong> at <strong>${company}</strong> has been scheduled.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Date:</strong> ${interviewDate || "TBD"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Time:</strong> ${interviewTime || "TBD"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Mode:</strong> ${interviewMode || "TBD"}</td></tr>
      ${interviewLink ? `<tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Link:</strong> <a href="${interviewLink}" style="color:#1a365d;">${interviewLink}</a></td></tr>` : ""}
    </table>
    <p style="margin:16px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      Please make sure you are prepared and have a stable internet connection if the interview is virtual.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildInterviewRescheduledHtml = (params) => {
  const { fullName, jobTitle, companyName } = params;
  const name = String(fullName || "").trim() || "there";
  const role = String(jobTitle || "the position").trim();
  const company = String(companyName || "the company").trim();

  const details = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Date:</strong> ${params.interviewDate || "TBD"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Time:</strong> ${params.interviewTime || "TBD"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Mode:</strong> ${params.interviewMode || "TBD"}</td></tr>
      ${params.interviewLink ? `<tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Link:</strong> <a href="${params.interviewLink}" style="color:#1a365d;">${params.interviewLink}</a></td></tr>` : ""}
    </table>
  `;

  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Interview Updated</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your interview for <strong>${role}</strong> at <strong>${company}</strong> has been rescheduled.
      Please find the updated details below.
    </p>
    ${details}
    <p style="margin:16px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      If you have any questions, please contact the recruiter directly.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildOfferIssuedHtml = ({ fullName, companyName, jobTitle, offerLink }) => {
  const name = String(fullName || "").trim() || "there";
  const company = String(companyName || "the company").trim();
  const role = String(jobTitle || "the position").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Congratulations! Offer Letter Issued</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      We are pleased to inform you that <strong>${company}</strong> has issued an offer letter for the
      position of <strong>${role}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0fdf4;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:16px;color:#166534;font-weight:600;text-align:center;">&#127881; Congratulations!</p>
        </td>
      </tr>
    </table>
    ${offerLink ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${offerLink}" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            View offer letter
          </a>
        </td>
      </tr>
    </table>
    ` : ""}
    <p style="margin:16px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      Please review the offer letter carefully and respond at your earliest convenience.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildOfferAcceptedRecruiterHtml = ({ candidateName, jobTitle }) => {
  const candidate = String(candidateName || "A candidate").trim();
  const role = String(jobTitle || "a position").trim();
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Offer Accepted</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      <strong>${candidate}</strong> has accepted the offer for the <strong>${role}</strong> position.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0fdf4;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">
            Please proceed with the onboarding process.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildRecruiterWelcomeHtml = ({ fullName }) => {
  const name = String(fullName || "").trim() || "there";
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Welcome to ${APP_NAME} Recruiter</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your recruiter account has been created successfully. You can now post jobs, review applications,
      schedule interviews, and manage offers — all from your recruiter dashboard.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/recruiter/login" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Go to dashboard
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildNewApplicationReceivedHtml = ({ candidateName, jobTitle }) => {
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">New Application Received</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      <strong>${candidateName || "A candidate"}</strong> has applied for the <strong>${jobTitle || "position"}</strong> role.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/recruiter/applications" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Review application
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

const buildJobPostedHtml = ({ jobTitle }) => {
  return mavenWrapLayout(`
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Job Posted Successfully</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      Your job posting for <strong>${jobTitle || "a position"}</strong> is now live on ${APP_NAME}.
      Candidates can start applying immediately.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0fdf4;border-radius:8px;padding:16px;">
      <tr>
        <td>
          <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">&#10003; Job is now active</p>
          <p style="margin:4px 0 0 0;font-size:14px;color:#166534;">
            You will receive notifications when candidates apply.
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background-color:#1a365d;border-radius:8px;padding:12px 28px;">
          <a href="${APP_URL}/recruiter/jobs" target="_blank" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
            Manage job postings
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The ${APP_NAME} Team</p>
  `);
};

module.exports = {
  buildWelcomeHtml,
  buildOtpHtml,
  buildPasswordResetHtml,
  buildSecurityAlertHtml,
  buildApplicationConfirmationHtml,
  buildShortlistedHtml,
  buildRejectedHtml,
  buildInterviewScheduledHtml,
  buildInterviewRescheduledHtml,
  buildOfferIssuedHtml,
  buildOfferAcceptedRecruiterHtml,
  buildRecruiterWelcomeHtml,
  buildNewApplicationReceivedHtml,
  buildJobPostedHtml,
};
