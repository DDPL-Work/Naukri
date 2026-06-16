const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");
const { sendEmailSafe, checkPreferences } = require("./subscriberUtils");
const {
  buildWelcomeHtml,
  buildPasswordResetHtml,
  buildNewApplicationReceivedHtml,
  buildJobPostedHtml,
  buildOfferAcceptedRecruiterHtml,
} = require("../email/templates/mavenTemplates");

function registerRecruiterSubscribers() {
  EventBus.on(EVENTS.RECRUITER_REGISTERED, (payload) => {
    handleRecruiterRegistered(payload).catch(() => {});
  });

  EventBus.on(EVENTS.RECRUITER_PASSWORD_RESET_REQUESTED, (payload) => {
    handleRecruiterPasswordReset(payload).catch(() => {});
  });

  EventBus.on(EVENTS.RECRUITER_JOB_POSTED, (payload) => {
    handleJobPosted(payload).catch(() => {});
  });

  EventBus.on(EVENTS.RECRUITER_NEW_APPLICATION_RECEIVED, (payload) => {
    handleNewApplication(payload).catch(() => {});
  });

  EventBus.on(EVENTS.RECRUITER_OFFER_RESPONSE, (payload) => {
    handleOfferResponse(payload).catch(() => {});
  });

  EventBus.on(EVENTS.RECRUITER_INTERVIEW_CONFIRMATION, (payload) => {
    handleInterviewConfirmation(payload).catch(() => {});
  });
}

async function handleRecruiterRegistered(payload) {
  const { email, fullName } = payload;
  if (!email) return;
  const html = buildWelcomeHtml({ fullName });
  await sendEmailSafe({
    eventName: EVENTS.RECRUITER_REGISTERED,
    to: email,
    subject: "Welcome to Maven Jobs",
    html,
    metadata: { fullName },
  });
}

async function handleRecruiterPasswordReset(payload) {
  const { email, fullName, resetLink } = payload;
  if (!email || !resetLink) return;
  const html = buildPasswordResetHtml({ fullName, resetLink });
  await sendEmailSafe({
    eventName: EVENTS.RECRUITER_PASSWORD_RESET_REQUESTED,
    to: email,
    subject: "Reset Your Password",
    html,
    metadata: { hasResetLink: true },
  });
}

async function handleJobPosted(payload) {
  const { email, jobTitle } = payload;
  if (!email) return;
  const html = buildJobPostedHtml({ jobTitle });
  await sendEmailSafe({
    eventName: EVENTS.RECRUITER_JOB_POSTED,
    to: email,
    subject: "Job Posted Successfully",
    html,
    metadata: { jobTitle },
  });
}

async function handleNewApplication(payload) {
  const { email, candidateName, jobTitle } = payload;
  if (!email) return;
  const html = buildNewApplicationReceivedHtml({ candidateName, jobTitle });
  await sendEmailSafe({
    eventName: EVENTS.RECRUITER_NEW_APPLICATION_RECEIVED,
    to: email,
    subject: "New Application Received",
    html,
    metadata: { candidateName, jobTitle },
  });
}

async function handleOfferResponse(payload) {
  const { email, candidateName, jobTitle, accepted } = payload;
  if (!email) return;
  const subject = accepted ? "Offer Accepted" : "Offer Declined";
  const html = buildOfferAcceptedRecruiterHtml({ candidateName, jobTitle });
  await sendEmailSafe({
    eventName: EVENTS.RECRUITER_OFFER_RESPONSE,
    to: email,
    subject,
    html,
    metadata: { candidateName, jobTitle, accepted },
  });
}

async function handleInterviewConfirmation(payload) {
  const { email, candidateName, jobTitle, interviewDate, interviewTime } = payload;
  if (!email) return;
  const html = `
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#0f172a;">Interview Confirmed</h2>
    <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.7;">Hello,</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">
      <strong>${candidateName || "The candidate"}</strong> has confirmed their interview for
      <strong>${jobTitle || "the position"}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f8fafc;border-radius:8px;padding:16px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Date:</strong> ${interviewDate || "TBD"}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#475569;"><strong>Time:</strong> ${interviewTime || "TBD"}</td></tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:15px;color:#475569;line-height:1.7;">Best regards,<br />The Maven Jobs Team</p>`;
  await sendEmailSafe({
    eventName: EVENTS.RECRUITER_INTERVIEW_CONFIRMATION,
    to: email,
    subject: "Interview Confirmed",
    html,
    metadata: { candidateName, jobTitle },
  });
}

module.exports = { registerRecruiterSubscribers };
