const EmailQueue = require("../email/queue/emailQueue");
const emailModule = require("../email");
const logger = require("../config/logger");
const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");
const { sendEmailSafe, maskEmail } = require("./subscriberUtils");
const { incrementCounter } = require("../email/metrics/metrics");

function registerAdminSubscribers() {
  EventBus.on(EVENTS.ADMIN_NEW_RECRUITER_REGISTRATION, (payload) => {
    handleNewRecruiterRegistration(payload).catch(() => {});
  });

  EventBus.on(EVENTS.ADMIN_HIGH_EMAIL_FAILURE_RATE, (payload) => {
    handleHighEmailFailureRate(payload).catch(() => {});
  });

  EventBus.on(EVENTS.ADMIN_DAILY_SUMMARY, (payload) => {
    handleDailySummary(payload).catch(() => {});
  });

  EventBus.on(EVENTS.ADMIN_PRODUCTION_ALERT, (payload) => {
    handleProductionAlert(payload).catch(() => {});
  });
}

async function sendAdminEmailWithQueue({ to, subject, html, metadata }) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === "true";
  if (queueEnabled) {
    try {
      const bull = require("bullmq");
      const queue = new EmailQueue({ processor: null });
      await queue.initialize();
      const result = await queue.add({ to, subject, html, metadata });
      incrementCounter("emails_queued_total");
      logger.info("[admin:notif] Email queued", {
        recipient: maskEmail(to),
        subject,
        jobId: result.jobId,
        ...metadata,
      });
      return result;
    } catch {
      logger.warn("[admin:notif] Queue unavailable, sending inline");
    }
  }
  return sendEmailSafe({ eventName: "admin_notification", to, subject, html, metadata });
}

async function handleNewRecruiterRegistration(payload) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@mavenjobs.com";
  const { email, companyName, fullName } = payload;
  const html = `
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">New Recruiter Registration</h2>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      A new recruiter has registered on ${process.env.APP_NAME || "Maven Jobs"}.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Name:</strong> ${fullName || "N/A"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Email:</strong> ${maskEmail(email)}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Company:</strong> ${companyName || "N/A"}</td></tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />System Notification</p>`;
  await sendAdminEmailWithQueue({
    to: adminEmail,
    subject: "New Recruiter Registration",
    html,
    metadata: { recruiterEmail: email },
  });
}

async function handleHighEmailFailureRate(payload) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@mavenjobs.com";
  const { failureRate, threshold, timeWindow } = payload;
  const html = `
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#dc2626;">High Email Failure Rate Alert</h2>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      The email system is experiencing a high failure rate.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#fef2f2;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#991b1b;"><strong>Failure Rate:</strong> ${failureRate}%</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#991b1b;"><strong>Threshold:</strong> ${threshold}%</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#991b1b;"><strong>Time Window:</strong> ${timeWindow}</td></tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">
      Please investigate the email provider configuration and check the logs.
    </p>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />System Notification</p>`;
  await sendAdminEmailWithQueue({
    to: adminEmail,
    subject: "High Email Failure Rate",
    html,
    metadata: { failureRate, threshold },
  });
}

async function handleDailySummary(payload) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@mavenjobs.com";
  const { date, emailsSent, emailsFailed, newRegistrations, newApplications, alerts } = payload;
  const html = `
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Daily Summary — ${date || "Today"}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Emails Sent:</strong> ${emailsSent || 0}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Emails Failed:</strong> ${emailsFailed || 0}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>New Registrations:</strong> ${newRegistrations || 0}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>New Applications:</strong> ${newApplications || 0}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Active Alerts:</strong> ${(alerts || []).length}</td></tr>
    </table>
    ${alerts && alerts.length > 0 ? `
    <p style="margin:16px 0 8px 0;font-size:14px;font-weight:600;color:#dc2626;">Active Alerts:</p>
    ${alerts.map(a => `<p style="margin:4px 0;font-size:13px;color:#64748b;">• ${a}</p>`).join("")}
    ` : ""}
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />System Notification</p>`;
  await sendAdminEmailWithQueue({
    to: adminEmail,
    subject: `Daily Summary — ${date || "Today"}`,
    html,
    metadata: { date, emailsSent },
  });
}

async function handleProductionAlert(payload) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@mavenjobs.com";
  const { level, message, details } = payload;
  const colors = { CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#ca8a04" };
  const color = colors[level] || "#64748b";
  const html = `
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:${color};">${level || "INFO"} Alert</h2>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">${message || "No details"}</p>
    ${details ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;white-space:pre-wrap;">${JSON.stringify(details, null, 2)}</td></tr>
    </table>
    ` : ""}
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />System Notification</p>`;
  await sendAdminEmailWithQueue({
    to: adminEmail,
    subject: `${level} Alert: ${(message || "").substring(0, 80)}`,
    html,
    metadata: { level, ...details },
  });
}

module.exports = { registerAdminSubscribers };
