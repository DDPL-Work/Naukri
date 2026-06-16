# Event-Driven Email Notifications

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Controller                        │
│  (auth, application, interview, offer, etc.)                    │
└───────────┬─────────────────────────────────────────────────────┘
            │  Business Action (e.g., candidate registers)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database Transaction                         │
│  (save user, save application, etc.)                             │
└───────────┬─────────────────────────────────────────────────────┘
            │  On success, emit domain event
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EventBus.emit(event, payload)                 │
└───────────┬─────────────────────────────────────────────────────┘
            │  Fire-and-forget (never awaited)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Subscribers                             │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Candidate Subscriber│  │Recruiter Subscriber│  │Admin Subscriber│
│  └─────────┬───────────┘  └────────┬─────────┘  └──────┬──────┘ │
└────────────┼────────────────────────┼───────────────────┼────────┘
             │                        │                   │
             ▼                        ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              Email Module (server/src/email/index.js)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │Rate      │→ │Circuit   │→ │Queue     │→ │sendEmail()     │  │
│  │Limiter   │  │Breaker   │  │(BullMQ)  │  │                │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬────────┘  │
│                                                     │           │
└─────────────────────────────────────────────────────┼───────────┘
                                                       ▼
                                              ┌─────────────────┐
                                              │ SMTP / AWS SES  │
                                              │  Provider        │
                                              └─────────────────┘
```

## Sequence Diagram — Candidate Registration Flow

```
Controller              DB              EventBus         Subscriber         Email Module
    │                    │                │                  │                  │
    │  register()        │                │                  │                  │
    │───────────────────>│                │                  │                  │
    │                    │                │                  │                  │
    │  save user         │                │                  │                  │
    │───────────────────>│                │                  │                  │
    │                    │                │                  │                  │
    │  user saved        │                │                  │                  │
    │<───────────────────│                │                  │                  │
    │                    │                │                  │                  │
    │  emit(             │                │                  │                  │
    │  candidate.        │                │                  │                  │
    │  registered)       │                │                  │                  │
    │────────────────────────────────────>│                  │                  │
    │                    │                │                  │                  │
    │  return success    │                │  fire handler    │                  │
    │  to user ────────── END OF REQUEST  │─────────────────>│                  │
    │                    │                │                  │                  │
    │                    │                │    check prefs   │                  │
    │                    │                │    (async)       │                  │
    │                    │                │       │          │                  │
    │                    │                │    build template │                 │
    │                    │                │       │          │                  │
    │                    │                │    sendEmail()   │                  │
    │                    │                │──────────────────────────────────>│
    │                    │                │                  │                  │
    │                    │                │    log success    │   email sent    │
    │                    │                │<───────────────────────────────────│
    │                    │                │                  │                  │
```

## File Structure

```
server/src/
├── events/                              # Domain Event System
│   ├── EventBus.js                      # Lightweight EventBus (singleton)
│   ├── events.js                        # Event name constants + preference mappings
│   └── index.js                         # Public exports
│
├── subscribers/                         # Email Notification Handlers
│   ├── index.js                         # Registers all subscribers
│   ├── subscriberUtils.js               # Shared helpers (masking, prefs check, safe send)
│   ├── candidate.subscriber.js          # 12 candidate event handlers
│   ├── recruiter.subscriber.js          # 6 recruiter event handlers
│   └── admin.subscriber.js             # 4 admin event handlers (queue-enabled)
│
├── models/
│   └── NotificationPreferences.js       # User email preference toggles
│
├── email/templates/
│   └── mavenTemplates.js                # 14 responsive HTML email templates
│
├── controllers/
│   └── notificationPreferences.controller.js  # GET/PUT preferences API
│
├── routes/
│   └── notificationPreferences.routes.js      # /api/v1/notifications/preferences
│
└── app.js                               # + subscriber registration on startup
```

## Events Reference

### Candidate Events (12)

| Event | Trigger | Subject | Template Variables |
|---|---|---|---|
| `candidate.registered` | Successful registration | Welcome to Maven Jobs | `fullName` |
| `candidate.email_verification_otp` | OTP generated | Verify Your Email | `fullName`, `otp` |
| `candidate.login_otp` | Login verification | Your Login Verification Code | `otp` |
| `candidate.password_reset_requested` | Forgot password | Reset Your Password | `fullName`, `resetLink` |
| `candidate.password_changed` | Password updated | Your Password Was Changed | `fullName`, `timestamp`, `ipAddress` |
| `candidate.application_submitted` | Job application | Application Received | `fullName`, `jobTitle`, `companyName` |
| `candidate.application_shortlisted` | Recruiter shortlists | You've Been Shortlisted | `fullName`, `jobTitle`, `companyName` |
| `candidate.application_rejected` | Recruiter rejects | Application Status Update | `fullName`, `jobTitle`, `companyName` |
| `candidate.interview_scheduled` | Interview scheduled | Interview Scheduled | `fullName`, `jobTitle`, `companyName`, `interviewDate`, `interviewTime`, `interviewMode`, `interviewLink` |
| `candidate.interview_rescheduled` | Interview rescheduled | Interview Updated | Same as above |
| `candidate.offer_issued` | Offer letter sent | Congratulations! Offer Letter Issued | `fullName`, `companyName`, `jobTitle`, `offerLink` |
| `candidate.offer_accepted` | Offer accepted | Offer Accepted (sent to recruiter) | `recruiterEmail`, `candidateName`, `jobTitle` |

### Recruiter Events (6)

| Event | Subject | Key Payload |
|---|---|---|
| `recruiter.registered` | Welcome to Maven Jobs | `email`, `fullName` |
| `recruiter.password_reset_requested` | Reset Your Password | `email`, `fullName`, `resetLink` |
| `recruiter.job_posted` | Job Posted Successfully | `email`, `jobTitle` |
| `recruiter.new_application_received` | New Application Received | `email`, `candidateName`, `jobTitle` |
| `recruiter.offer_response` | Offer Accepted / Declined | `email`, `candidateName`, `jobTitle`, `accepted` |
| `recruiter.interview_confirmation` | Interview Confirmed | `email`, `candidateName`, `jobTitle`, `interviewDate`, `interviewTime` |

### Admin Events (4)

| Event | Subject | Queue Mode |
|---|---|---|
| `admin.new_recruiter_registration` | New Recruiter Registration | Yes (BullMQ) |
| `admin.high_email_failure_rate` | High Email Failure Rate | Yes |
| `admin.daily_summary` | Daily Summary — {date} | Yes |
| `admin.production_alert` | {Level} Alert: {message} | Yes |

## Notification Preferences

Users can opt out of non-critical email categories via `NotificationPreferences`.

**Never-blocked events** (always sent regardless of preferences):
- `candidate.registered`
- `candidate.email_verification_otp`
- `candidate.login_otp`
- `candidate.password_reset_requested`
- `candidate.password_changed`
- `candidate.offer_accepted`
- `recruiter.registered`
- `recruiter.password_reset_requested`
- All admin events

**Opt-out categories** (user-configurable):
- `applicationUpdates` — shortlisted, rejected, interview scheduled/rescheduled
- `marketingEmails` — future marketing campaigns
- `jobRecommendations` — job posted notifications
- `blogUpdates` — future blog post notifications

### API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/notifications/preferences` | JWT | Get current preferences |
| PUT | `/api/v1/notifications/preferences` | JWT | Update preferences |

```json
// PUT /api/v1/notifications/preferences
{
  "applicationUpdates": false,
  "marketingEmails": false
}
```

## Emitting Events from Controllers

```js
const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");

// After successful registration
const user = await User.create({ ... });
EventBus.emit(EVENTS.CANDIDATE_REGISTERED, {
  candidateId: user._id,
  email: user.email,
  fullName: user.name,
});

// After successful application
const application = await Application.create({ ... });
EventBus.emit(EVENTS.CANDIDATE_APPLICATION_SUBMITTED, {
  email: candidate.email,
  fullName: candidate.name,
  jobTitle: job.title,
  companyName: company.name,
  applicationId: application._id,
});

// After interview is scheduled
EventBus.emit(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED, {
  email: candidate.email,
  fullName: candidate.name,
  jobTitle: job.title,
  companyName: company.name,
  interviewDate: "2026-07-15",
  interviewTime: "10:00 AM",
  interviewMode: "Video Call",
  interviewLink: "https://meet.google.com/abc-defg-hij",
});

// After offer is accepted
EventBus.emit(EVENTS.CANDIDATE_OFFER_ACCEPTED, {
  recruiterEmail: recruiter.email,
  candidateName: candidate.name,
  jobTitle: job.title,
});
```

## Admin Alerts

```js
// High email failure rate
EventBus.emit(EVENTS.ADMIN_HIGH_EMAIL_FAILURE_RATE, {
  failureRate: 25,
  threshold: 10,
  timeWindow: "1h",
});

// Daily summary (cron job)
EventBus.emit(EVENTS.ADMIN_DAILY_SUMMARY, {
  date: "2026-06-16",
  emailsSent: 1250,
  emailsFailed: 3,
  newRegistrations: 42,
  newApplications: 180,
  alerts: ["High failure rate at 14:00", "Redis connection slow"],
});

// Production alert
EventBus.emit(EVENTS.ADMIN_PRODUCTION_ALERT, {
  level: "CRITICAL",
  message: "SES send quota at 95%",
  details: { quotaUsed: 47500, quotaMax: 50000 },
});
```

## Queue Behavior

Admin events (`ADMIN_NEW_RECRUITER_REGISTRATION`, `ADMIN_HIGH_EMAIL_FAILURE_RATE`, `ADMIN_DAILY_SUMMARY`, `ADMIN_PRODUCTION_ALERT`) check for BullMQ availability:

- If `EMAIL_QUEUE_ENABLED=true` and `bullmq` is installed: queued via BullMQ with 3 retries, exponential backoff
- If queue unavailable: falls back to immediate inline send

All candidate and recruiter events send immediately via the existing email module's rate limiter + circuit breaker.

## Error Handling

- **Event handlers NEVER throw.** All errors are caught and logged.
- **Email failures NEVER break business workflows.** The controller's DB transaction completes independently.
- **Logging:** All sends are logged with masked emails, event name, latency, and messageId.
- **Metrics:** `emails_sent_total`, `emails_failed_total`, and per-event counters via `incrementCounter()`.

## Template Preview

All 14 templates are responsive HTML with Maven Jobs branding (navy blue `#1a365d` header, accessible typography, mobile-optimized layout). Templates include:

| # | Template | Purpose |
|---|---|---|
| 1 | `buildWelcomeHtml` | Candidate/Recruiter registration |
| 2 | `buildOtpHtml` | Email verification & login OTP |
| 3 | `buildPasswordResetHtml` | Password reset with CTA link |
| 4 | `buildSecurityAlertHtml` | Password changed notification |
| 5 | `buildApplicationConfirmationHtml` | Application received |
| 6 | `buildShortlistedHtml` | Shortlisted with CTA |
| 7 | `buildRejectedHtml` | Polite rejection with CTA to browse more |
| 8 | `buildInterviewScheduledHtml` | Interview details table |
| 9 | `buildInterviewRescheduledHtml` | Updated interview details |
| 10 | `buildOfferIssuedHtml` | Congratulations with offer link |
| 11 | `buildOfferAcceptedRecruiterHtml` | Recruiter notification |
| 12 | `buildRecruiterWelcomeHtml` | Recruiter-specific welcome |
| 13 | `buildNewApplicationReceivedHtml` | New application alert for recruiter |
| 14 | `buildJobPostedHtml` | Job posting confirmed |

## Test Coverage

| Test Suite | Tests | What it covers |
|---|---|---|
| `EventBus.test.js` | 12 | on/emit/off, async errors, removeAllListeners, listenerCount, event constants, preference mappings |
| `NotificationPreferences.test.js` | 3 | Schema field validation, compound index, timestamps |
| `subscriberUtils.test.js` | 10 | Email masking, IP masking, preference checking (all paths), safe send (success + failure) |
| `candidateSubscriber.test.js` | 6 | Handler registration counts (candidate/recruiter/admin/all), fire without throw, missing fields |
| `mavenTemplates.test.js` | 16 | All 14 templates render correct content + 2 aggregate validation (proper HTML structure, all 14 types) |

**Total: 47 new tests** + 154 existing email tests = **201 tests total**
