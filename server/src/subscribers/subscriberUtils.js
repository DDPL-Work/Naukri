const emailModule = require("../email");
const logger = require("../config/logger");
const NotificationPreferences = require("../models/NotificationPreferences");
const { incrementCounter } = require("../email/metrics/metrics");
const { SKIP_PREFERENCES_EVENTS, EVENT_PREFERENCES_MAP } = require("../events/events");

function maskEmail(email) {
  if (!email || typeof email !== "string") return email;
  const atIndex = email.indexOf("@");
  if (atIndex <= 1) return email;
  return email[0] + "***" + email.substring(atIndex);
}

function maskIP(ip) {
  if (!ip) return "N/A";
  const parts = ip.split(".");
  if (parts.length === 4) return parts[0] + ".***.***." + parts[3];
  return ip;
}

async function checkPreferences(eventName, userId) {
  if (SKIP_PREFERENCES_EVENTS.includes(eventName)) return true;
  const category = EVENT_PREFERENCES_MAP[eventName];
  if (!category) return true;
  try {
    const prefs = await NotificationPreferences.findOne({ userId }).lean();
    if (!prefs) return true;
    return prefs[category] !== false;
  } catch {
    return true;
  }
}

async function sendEmailSafe({ eventName, to, subject, html, text, metadata }) {
  const startTime = Date.now();
  try {
    const result = await emailModule.sendEmail({ to, subject, html, text });
    const latency = Date.now() - startTime;
    logger.info(`[notif:${eventName}] Email sent`, {
      event: eventName,
      recipient: maskEmail(to),
      messageId: result.messageId,
      latency,
      ...metadata,
    });
    incrementCounter("emails_sent_total");
    incrementCounter(`${eventName.replace(/\./g, "_")}_sent`);
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.warn(`[notif:${eventName}] Failed to send`, {
      event: eventName,
      recipient: maskEmail(to),
      error: error.message,
      latency,
      ...metadata,
    });
    incrementCounter("emails_failed_total");
    incrementCounter(`${eventName.replace(/\./g, "_")}_failed`);
    return null;
  }
}

module.exports = {
  maskEmail,
  maskIP,
  checkPreferences,
  sendEmailSafe,
};
