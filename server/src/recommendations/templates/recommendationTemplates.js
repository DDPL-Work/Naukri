const { generateUnsubscribeToken } = require("../utils/unsubscribeToken");

const FRONTEND_URL = () => process.env.FRONTEND_URL || "https://maven-jobs.com";
const API_BASE = () => process.env.API_BASE_URL || "https://mavenjobs.in/api/v1";

function buildClickUrl(jobId, userId, messageId) {
  return `${API_BASE()}/recommendations/click?jobId=${encodeURIComponent(String(jobId))}&userId=${encodeURIComponent(String(userId))}&messageId=${encodeURIComponent(messageId || "")}`;
}

function buildRecommendationEmail(userName, recommendations, plan, userId, email) {
  const isElite = plan === "ELITE";
  const subject = isElite
    ? "Exclusive Elite Job Opportunities Await ⭐"
    : "Your Top 3 Job Matches for Today 🚀";
  const heading = isElite
    ? "Your Exclusive Elite Job Matches"
    : "Your Daily Job Recommendations";
  const messageId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const unsubscribeToken = userId && email ? generateUnsubscribeToken(userId, email, "recommendations").token : "";

  const jobCards = recommendations.map((job, i) => {
    const clickUrl = userId ? buildClickUrl(job.jobId, userId, messageId) : (job.applyUrl || "#");
    return `
    <tr>
      <td style="padding:16px 24px;background:#f8fafc;border-radius:8px;margin-bottom:12px;display:block;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#1a365d;">
                ${i + 1}. ${escapeHtml(job.title)}
              </p>
              <p style="margin:0 0 4px;font-size:14px;color:#475569;">
                ${escapeHtml(job.companyName || "")}
              </p>
              <p style="margin:0 0 2px;font-size:13px;color:#64748b;">
                📍 ${escapeHtml(job.location || "Various")}
                ${job.salaryRange ? `&nbsp;|&nbsp;💰 ${escapeHtml(job.salaryRange)}` : ""}
                ${job.experience ? `&nbsp;|&nbsp;⚡ ${escapeHtml(job.experience)}` : ""}
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Match Score: ${job.score}%
              </p>
            </td>
            <td width="120" style="text-align:right;vertical-align:middle;">
              <a href="${escapeHtml(clickUrl)}" target="_blank"
                 style="display:inline-block;padding:8px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500;">
                Apply Now →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#1a365d;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Maven Jobs</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1a365d;">Hi ${escapeHtml(userName)},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;">
                Based on your profile, here are today's ${isElite ? "exclusive elite " : ""}recommendations:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${jobCards}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(FRONTEND_URL())}/jobs"
                       target="_blank"
                       style="display:inline-block;padding:12px 32px;background:#1a365d;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">
                      Explore More Jobs →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                You are receiving this because you are a ${isElite ? "Maven Jobs Elite" : "Maven Jobs Pro"} member.
                <a href="${escapeHtml(FRONTEND_URL())}/notifications/preferences"
                   target="_blank" style="color:#2563eb;text-decoration:underline;">Manage preferences</a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                <a href="${escapeHtml(API_BASE())}/recommendations/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}&type=recommendations"
                   target="_blank" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from recommendation emails</a>
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Maven Jobs. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, messageId };
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { buildRecommendationEmail, escapeHtml, buildClickUrl };
