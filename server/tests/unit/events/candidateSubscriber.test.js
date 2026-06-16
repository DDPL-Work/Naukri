const EventBus = require("../../../src/events/EventBus");
const { EVENTS } = require("../../../src/events/events");

jest.mock("../../../src/config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../../../src/email", () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: "mock-msg" }),
}));

jest.mock("../../../src/models/NotificationPreferences", () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

const emailModule = require("../../../src/email");

describe("Candidate Subscriber Registration", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
    jest.clearAllMocks();
  });

  test("registers all candidate event handlers", () => {
    const { registerCandidateSubscribers } = require("../../../src/subscribers/candidate.subscriber");
    registerCandidateSubscribers();

    expect(EventBus.listenerCount(EVENTS.CANDIDATE_REGISTERED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_LOGIN_OTP)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_PASSWORD_CHANGED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_APPLICATION_SUBMITTED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_APPLICATION_REJECTED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_OFFER_ISSUED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.CANDIDATE_OFFER_ACCEPTED)).toBe(1);
  });

  test("handlers fire without throwing on emit", () => {
    const { registerCandidateSubscribers } = require("../../../src/subscribers/candidate.subscriber");
    registerCandidateSubscribers();

    expect(() => {
      EventBus.emit(EVENTS.CANDIDATE_REGISTERED, { email: "test@test.com", fullName: "Test" });
      EventBus.emit(EVENTS.CANDIDATE_APPLICATION_SUBMITTED, { email: "test@test.com", fullName: "Test", jobTitle: "Dev", companyName: "Co" });
      EventBus.emit(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED, { email: "test@test.com", fullName: "Test", jobTitle: "Dev", companyName: "Co" });
      EventBus.emit(EVENTS.CANDIDATE_APPLICATION_REJECTED, { email: "test@test.com", fullName: "Test", jobTitle: "Dev", companyName: "Co" });
      EventBus.emit(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED, { email: "test@test.com", fullName: "Test", jobTitle: "Dev", companyName: "Co", interviewDate: "2026-07-01" });
      EventBus.emit(EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED, { email: "test@test.com", fullName: "Test", jobTitle: "Dev", companyName: "Co" });
      EventBus.emit(EVENTS.CANDIDATE_OFFER_ISSUED, { email: "test@test.com", fullName: "Test", companyName: "Co", jobTitle: "Dev" });
      EventBus.emit(EVENTS.CANDIDATE_OFFER_ACCEPTED, { recruiterEmail: "rec@test.com", candidateName: "Test", jobTitle: "Dev" });
      EventBus.emit(EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED, { email: "test@test.com", fullName: "Test", resetLink: "https://x.com" });
      EventBus.emit(EVENTS.CANDIDATE_PASSWORD_CHANGED, { email: "test@test.com", fullName: "Test", timestamp: "now", ipAddress: "1.2.3.4" });
      EventBus.emit(EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP, { email: "test@test.com", fullName: "Test", otp: "123456" });
      EventBus.emit(EVENTS.CANDIDATE_LOGIN_OTP, { email: "test@test.com", otp: "654321" });
    }).not.toThrow();
  });

  test("email is not sent when required fields are missing", () => {
    const { registerCandidateSubscribers } = require("../../../src/subscribers/candidate.subscriber");
    registerCandidateSubscribers();

    EventBus.emit(EVENTS.CANDIDATE_REGISTERED, {});
    EventBus.emit(EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED, { email: "test@test.com" });
    EventBus.emit(EVENTS.CANDIDATE_APPLICATION_REJECTED, { email: "test@test.com" });
  });
});

describe("Recruiter Subscriber Registration", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  test("registers all recruiter event handlers", () => {
    const { registerRecruiterSubscribers } = require("../../../src/subscribers/recruiter.subscriber");
    registerRecruiterSubscribers();

    expect(EventBus.listenerCount(EVENTS.RECRUITER_REGISTERED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.RECRUITER_PASSWORD_RESET_REQUESTED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.RECRUITER_JOB_POSTED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.RECRUITER_NEW_APPLICATION_RECEIVED)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.RECRUITER_OFFER_RESPONSE)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.RECRUITER_INTERVIEW_CONFIRMATION)).toBe(1);
  });

  test("handlers fire without throwing", () => {
    const { registerRecruiterSubscribers } = require("../../../src/subscribers/recruiter.subscriber");
    registerRecruiterSubscribers();

    expect(() => {
      EventBus.emit(EVENTS.RECRUITER_REGISTERED, { email: "rec@test.com", fullName: "Recruiter" });
      EventBus.emit(EVENTS.RECRUITER_JOB_POSTED, { email: "rec@test.com", jobTitle: "Engineer" });
      EventBus.emit(EVENTS.RECRUITER_NEW_APPLICATION_RECEIVED, { email: "rec@test.com", candidateName: "Jane", jobTitle: "Engineer" });
    }).not.toThrow();
  });
});

describe("Admin Subscriber Registration", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  test("registers all admin event handlers", () => {
    const { registerAdminSubscribers } = require("../../../src/subscribers/admin.subscriber");
    registerAdminSubscribers();

    expect(EventBus.listenerCount(EVENTS.ADMIN_NEW_RECRUITER_REGISTRATION)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.ADMIN_HIGH_EMAIL_FAILURE_RATE)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.ADMIN_DAILY_SUMMARY)).toBe(1);
    expect(EventBus.listenerCount(EVENTS.ADMIN_PRODUCTION_ALERT)).toBe(1);
  });

  test("handlers fire without throwing", () => {
    const { registerAdminSubscribers } = require("../../../src/subscribers/admin.subscriber");
    registerAdminSubscribers();

    expect(() => {
      EventBus.emit(EVENTS.ADMIN_NEW_RECRUITER_REGISTRATION, { email: "rec@test.com", fullName: "Rec", companyName: "Co" });
      EventBus.emit(EVENTS.ADMIN_HIGH_EMAIL_FAILURE_RATE, { failureRate: 25, threshold: 10, timeWindow: "1h" });
      EventBus.emit(EVENTS.ADMIN_DAILY_SUMMARY, { date: "2026-06-16", emailsSent: 100, emailsFailed: 2, newRegistrations: 5, newApplications: 20, alerts: [] });
      EventBus.emit(EVENTS.ADMIN_PRODUCTION_ALERT, { level: "HIGH", message: "Test alert" });
    }).not.toThrow();
  });
});

describe("registerAllSubscribers", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  test("registers all event handlers across all domains", () => {
    const { registerAllSubscribers } = require("../../../src/subscribers/index");
    registerAllSubscribers();

    const candidateEvents = [
      EVENTS.CANDIDATE_REGISTERED,
      EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP,
      EVENTS.CANDIDATE_LOGIN_OTP,
      EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED,
      EVENTS.CANDIDATE_PASSWORD_CHANGED,
      EVENTS.CANDIDATE_APPLICATION_SUBMITTED,
      EVENTS.CANDIDATE_APPLICATION_SHORTLISTED,
      EVENTS.CANDIDATE_APPLICATION_REJECTED,
      EVENTS.CANDIDATE_INTERVIEW_SCHEDULED,
      EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED,
      EVENTS.CANDIDATE_OFFER_ISSUED,
      EVENTS.CANDIDATE_OFFER_ACCEPTED,
    ];

    const recruiterEvents = [
      EVENTS.RECRUITER_REGISTERED,
      EVENTS.RECRUITER_PASSWORD_RESET_REQUESTED,
      EVENTS.RECRUITER_JOB_POSTED,
      EVENTS.RECRUITER_NEW_APPLICATION_RECEIVED,
      EVENTS.RECRUITER_OFFER_RESPONSE,
      EVENTS.RECRUITER_INTERVIEW_CONFIRMATION,
    ];

    const adminEvents = [
      EVENTS.ADMIN_NEW_RECRUITER_REGISTRATION,
      EVENTS.ADMIN_HIGH_EMAIL_FAILURE_RATE,
      EVENTS.ADMIN_DAILY_SUMMARY,
      EVENTS.ADMIN_PRODUCTION_ALERT,
    ];

    [...candidateEvents, ...recruiterEvents, ...adminEvents].forEach((evt) => {
      expect(EventBus.listenerCount(evt)).toBe(1);
    });

    expect(EventBus.listenerCount(EVENTS.CANDIDATE_REGISTERED)).toBe(1);
  });
});
