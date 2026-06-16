const EventBus = require("../../../src/events/EventBus");
const { EVENTS, EVENT_CATEGORIES, EVENT_PREFERENCES_MAP, SKIP_PREFERENCES_EVENTS, ALWAYS_SEND_EVENTS } = require("../../../src/events/events");

describe("EventBus", () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  describe("on / emit", () => {
    test("calls registered handler on emit", () => {
      const handler = jest.fn();
      EventBus.on("test.event", handler);
      EventBus.emit("test.event", { key: "value" });
      expect(handler).toHaveBeenCalledWith({ key: "value" });
    });

    test("calls multiple handlers for the same event", () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      EventBus.on("test.event", h1);
      EventBus.on("test.event", h2);
      EventBus.emit("test.event", { id: 1 });
      expect(h1).toHaveBeenCalledWith({ id: 1 });
      expect(h2).toHaveBeenCalledWith({ id: 1 });
    });

    test("does not throw if no handlers registered", () => {
      expect(() => EventBus.emit("nonexistent", {})).not.toThrow();
    });

    test("does not call removed handler", () => {
      const handler = jest.fn();
      const off = EventBus.on("test.event", handler);
      off();
      EventBus.emit("test.event", {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("async handlers", () => {
    test("does not await async handlers - catches errors", () => {
      const handler = jest.fn().mockRejectedValue(new Error("async error"));
      EventBus.on("test.async", handler);
      expect(() => EventBus.emit("test.async", {})).not.toThrow();
    });

    test("catches synchronous handler errors", () => {
      const handler = () => { throw new Error("sync error"); };
      EventBus.on("test.sync", handler);
      expect(() => EventBus.emit("test.sync", {})).not.toThrow();
    });
  });

  describe("off", () => {
    test("removes specific handler", () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      EventBus.on("test.event", h1);
      EventBus.on("test.event", h2);
      EventBus.off("test.event", h1);
      EventBus.emit("test.event", {});
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    test("does nothing if handler not in list", () => {
      const h1 = jest.fn();
      EventBus.on("test.event", h1);
      EventBus.off("test.event", jest.fn());
      EventBus.emit("test.event", {});
      expect(h1).toHaveBeenCalled();
    });
  });

  describe("removeAllListeners", () => {
    test("removes all handlers", () => {
      EventBus.on("a", jest.fn());
      EventBus.on("b", jest.fn());
      EventBus.removeAllListeners();
      expect(EventBus.listenerCount("a")).toBe(0);
      expect(EventBus.listenerCount("b")).toBe(0);
    });

    test("removes handlers for specific event only", () => {
      EventBus.on("a", jest.fn());
      EventBus.on("b", jest.fn());
      EventBus.removeAllListeners("a");
      expect(EventBus.listenerCount("a")).toBe(0);
      expect(EventBus.listenerCount("b")).toBe(1);
    });
  });

  describe("listenerCount", () => {
    test("returns correct count", () => {
      expect(EventBus.listenerCount("x")).toBe(0);
      EventBus.on("x", jest.fn());
      expect(EventBus.listenerCount("x")).toBe(1);
      EventBus.on("x", jest.fn());
      expect(EventBus.listenerCount("x")).toBe(2);
    });
  });
});

describe("Event Constants", () => {
  test("EVENTS is frozen", () => {
    expect(Object.isFrozen(EVENTS)).toBe(true);
  });

  test("EVENTS contains all candidate event keys", () => {
    expect(EVENTS.CANDIDATE_REGISTERED).toBe("candidate.registered");
    expect(EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP).toBe("candidate.email_verification_otp");
    expect(EVENTS.CANDIDATE_LOGIN_OTP).toBe("candidate.login_otp");
    expect(EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED).toBe("candidate.password_reset_requested");
    expect(EVENTS.CANDIDATE_PASSWORD_CHANGED).toBe("candidate.password_changed");
    expect(EVENTS.CANDIDATE_APPLICATION_SUBMITTED).toBe("candidate.application_submitted");
    expect(EVENTS.CANDIDATE_APPLICATION_SHORTLISTED).toBe("candidate.application_shortlisted");
    expect(EVENTS.CANDIDATE_APPLICATION_REJECTED).toBe("candidate.application_rejected");
    expect(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED).toBe("candidate.interview_scheduled");
    expect(EVENTS.CANDIDATE_INTERVIEW_RESCHEDULED).toBe("candidate.interview_rescheduled");
    expect(EVENTS.CANDIDATE_OFFER_ISSUED).toBe("candidate.offer_issued");
    expect(EVENTS.CANDIDATE_OFFER_ACCEPTED).toBe("candidate.offer_accepted");
  });

  test("EVENTS contains recruiter events", () => {
    expect(EVENTS.RECRUITER_REGISTERED).toBe("recruiter.registered");
    expect(EVENTS.RECRUITER_PASSWORD_RESET_REQUESTED).toBe("recruiter.password_reset_requested");
    expect(EVENTS.RECRUITER_JOB_POSTED).toBe("recruiter.job_posted");
    expect(EVENTS.RECRUITER_NEW_APPLICATION_RECEIVED).toBe("recruiter.new_application_received");
    expect(EVENTS.RECRUITER_OFFER_RESPONSE).toBe("recruiter.offer_response");
    expect(EVENTS.RECRUITER_INTERVIEW_CONFIRMATION).toBe("recruiter.interview_confirmation");
  });

  test("EVENTS contains admin events", () => {
    expect(EVENTS.ADMIN_NEW_RECRUITER_REGISTRATION).toBe("admin.new_recruiter_registration");
    expect(EVENTS.ADMIN_HIGH_EMAIL_FAILURE_RATE).toBe("admin.high_email_failure_rate");
    expect(EVENTS.ADMIN_DAILY_SUMMARY).toBe("admin.daily_summary");
    expect(EVENTS.ADMIN_PRODUCTION_ALERT).toBe("admin.production_alert");
  });

  test("SKIP_PREFERENCES_EVENTS contains mandatory events", () => {
    expect(SKIP_PREFERENCES_EVENTS).toContain(EVENTS.CANDIDATE_REGISTERED);
    expect(SKIP_PREFERENCES_EVENTS).toContain(EVENTS.CANDIDATE_EMAIL_VERIFICATION_OTP);
    expect(SKIP_PREFERENCES_EVENTS).toContain(EVENTS.CANDIDATE_LOGIN_OTP);
    expect(SKIP_PREFERENCES_EVENTS).toContain(EVENTS.CANDIDATE_PASSWORD_RESET_REQUESTED);
    expect(SKIP_PREFERENCES_EVENTS).toContain(EVENTS.CANDIDATE_PASSWORD_CHANGED);
  });

  test("EVENT_PREFERENCES_MAP maps opt-out events to categories", () => {
    expect(EVENT_PREFERENCES_MAP[EVENTS.CANDIDATE_APPLICATION_SHORTLISTED]).toBe("applicationUpdates");
    expect(EVENT_PREFERENCES_MAP[EVENTS.CANDIDATE_APPLICATION_REJECTED]).toBe("applicationUpdates");
    expect(EVENT_PREFERENCES_MAP[EVENTS.CANDIDATE_INTERVIEW_SCHEDULED]).toBe("applicationUpdates");
  });

  test("EVENT_CATEGORIES is frozen", () => {
    expect(Object.isFrozen(EVENT_CATEGORIES)).toBe(true);
  });
});
