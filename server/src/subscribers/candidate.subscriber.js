const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");
const { sendEmailSafe, checkPreferences } = require("./subscriberUtils");
const {
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
} = require("../email/templates/mavenTemplates");

function registerCandidateSubscribers() {
  EventBus.on(EVENTS.CANDIDATE_REGISTERED, (payload) => {
    handleCandidateRegistered(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP, (payload) => {
    handleEmailVerificationOtp(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_LOGIN_OTP, (payload) => {
    handleLoginOtp(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED, (payload) => {
    handlePasswordReset(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_PASSWORD_CHANGED, (payload) => {
    handlePasswordChanged(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_APPLICATION_SUBMITTED, (payload) => {
    handleApplicationSubmitted(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, (payload) => {
    handleApplicationShortlisted(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_APPLICATION_REJECTED, (payload) => {
    handleApplicationRejected(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED, (payload) => {
    handleInterviewScheduled(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED, (payload) => {
    handleInterviewRescheduled(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_OFFER_ISSUED, (payload) => {
    handleOfferIssued(payload).catch(() => {});
  });

  EventBus.on(EVENTS.CANDIDATE_OFFER_ACCEPTED, (payload) => {
    handleOfferAccepted(payload).catch(() => {});
  });
}

async function handleCandidateRegistered(payload) {
  const { email, fullName } = payload;
  if (!email) return;
  const html = buildWelcomeHtml({ fullName });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_REGISTERED,
    to: email,
    subject: "Welcome to Maven Jobs",
    html,
    metadata: { fullName },
  });
}

async function handleEmailVerificationOtp(payload) {
  const { email, fullName, otp } = payload;
  if (!email || !otp) return;
  const html = buildOtpHtml({ fullName, otp, purpose: "verification" });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP,
    to: email,
    subject: "Verify Your Email",
    html,
    metadata: { otpLength: String(otp).length },
  });
}

async function handleLoginOtp(payload) {
  const { email, otp } = payload;
  if (!email || !otp) return;
  const html = buildOtpHtml({ otp, purpose: "login" });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_LOGIN_OTP,
    to: email,
    subject: "Your Login Verification Code",
    html,
    metadata: { otpLength: String(otp).length },
  });
}

async function handlePasswordReset(payload) {
  const { email, fullName, resetLink } = payload;
  if (!email || !resetLink) return;
  const html = buildPasswordResetHtml({ fullName, resetLink });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED,
    to: email,
    subject: "Reset Your Password",
    html,
    metadata: { hasResetLink: true },
  });
}

async function handlePasswordChanged(payload) {
  const { email, fullName, timestamp, ipAddress } = payload;
  if (!email) return;
  const html = buildSecurityAlertHtml({ fullName, timestamp, ipAddress });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_PASSWORD_CHANGED,
    to: email,
    subject: "Your Password Was Changed",
    html,
    metadata: { timestamp, ipAddress },
  });
}

async function handleApplicationSubmitted(payload) {
  const { email, fullName, jobTitle, companyName } = payload;
  if (!email) return;
  const html = buildApplicationConfirmationHtml({ fullName, jobTitle, companyName });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_APPLICATION_SUBMITTED,
    to: email,
    subject: "Application Received",
    html,
    metadata: { jobTitle, companyName },
  });
}

async function handleApplicationShortlisted(payload) {
  const { email, fullName, jobTitle, companyName } = payload;
  if (!email) return;
  const allowed = await checkPreferences(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, payload.candidateId);
  if (!allowed) return;
  const html = buildShortlistedHtml({ fullName, jobTitle, companyName });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_APPLICATION_SHORTLISTED,
    to: email,
    subject: "You've Been Shortlisted",
    html,
    metadata: { jobTitle, companyName },
  });
}

async function handleApplicationRejected(payload) {
  const { email, fullName, jobTitle, companyName } = payload;
  if (!email) return;
  const allowed = await checkPreferences(EVENTS.CANDIDATE_APPLICATION_REJECTED, payload.candidateId);
  if (!allowed) return;
  const html = buildRejectedHtml({ fullName, jobTitle, companyName });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_APPLICATION_REJECTED,
    to: email,
    subject: "Application Status Update",
    html,
    metadata: { jobTitle, companyName },
  });
}

async function handleInterviewScheduled(payload) {
  const { email, fullName, jobTitle, companyName, interviewDate, interviewTime, interviewMode, interviewLink } = payload;
  if (!email) return;
  const allowed = await checkPreferences(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED, payload.candidateId);
  if (!allowed) return;
  const html = buildInterviewScheduledHtml({ fullName, jobTitle, companyName, interviewDate, interviewTime, interviewMode, interviewLink });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_INTERVIEW_SCHEDULED,
    to: email,
    subject: "Interview Scheduled",
    html,
    metadata: { jobTitle, companyName, interviewDate },
  });
}

async function handleInterviewRescheduled(payload) {
  const { email, fullName, jobTitle, companyName, interviewDate, interviewTime, interviewMode, interviewLink } = payload;
  if (!email) return;
  const allowed = await checkPreferences(EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED, payload.candidateId);
  if (!allowed) return;
  const html = buildInterviewRescheduledHtml({ fullName, jobTitle, companyName, interviewDate, interviewTime, interviewMode, interviewLink });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED,
    to: email,
    subject: "Interview Updated",
    html,
    metadata: { jobTitle, companyName, interviewDate },
  });
}

async function handleOfferIssued(payload) {
  const { email, fullName, companyName, jobTitle, offerLink } = payload;
  if (!email) return;
  const html = buildOfferIssuedHtml({ fullName, companyName, jobTitle, offerLink });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_OFFER_ISSUED,
    to: email,
    subject: "Congratulations! Offer Letter Issued",
    html,
    metadata: { jobTitle, companyName },
  });
}

async function handleOfferAccepted(payload) {
  const { recruiterEmail, candidateName, jobTitle } = payload;
  if (!recruiterEmail) return;
  const html = buildOfferAcceptedRecruiterHtml({ candidateName, jobTitle });
  await sendEmailSafe({
    eventName: EVENTS.CANDIDATE_OFFER_ACCEPTED,
    to: recruiterEmail,
    subject: "Offer Accepted",
    html,
    metadata: { candidateName, jobTitle },
  });
}

module.exports = { registerCandidateSubscribers };
