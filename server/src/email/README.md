# Email Module

Production-grade email service with automatic provider switching based on `NODE_ENV`.

## Architecture

```
src/email/
├── index.js                       # Public API — singleton manager, sendEmailWithInfrastructure
├── providers/
│   ├── emailProvider.js           # Abstract base class
│   ├── smtpProvider.js            # Nodemailer SMTP (dev/test)
│   └── sesProvider.js             # AWS SDK v3 SES (production)
├── factory/
│   └── emailProviderFactory.js    # Provider selection by environment
├── service/
│   └── emailService.js            # Template methods + validation
├── errors/
│   ├── EmailDeliveryError.js      # Structured error class
│   ├── TemplateValidationError.js # Template variable validation errors
│   └── AttachmentValidationError.js # Attachment validation errors
├── utils/
│   └── retry.js                   # Exponential backoff with jitter
├── circuitBreaker/
│   └── circuitBreaker.js          # Prevents repeated failures (CLOSED/OPEN/HALF_OPEN)
├── queue/
│   └── emailQueue.js              # BullMQ-backed async queue (optional)
├── rateLimiter/
│   └── rateLimiter.js             # Token-bucket rate limiter
├── validation/
│   ├── attachments.js             # MIME whitelist, size check, virus scan hook
│   └── templates.js               # Placeholder extraction, variable validation
├── templates/
│   └── layouts.js                 # HTML email templates
├── metrics/
│   └── metrics.js                 # Prometheus + JSON counters & histograms
└── diagnostics/
    ├── sandbox.js                 # SES sandbox detection via GetSendQuota
    └── productionReadiness.js     # Identity, DKIM, MAIL FROM checks
```

## Provider Selection

| NODE_ENV     | Provider           | Transport     |
|-------------|--------------------|---------------|
| development | SmtpEmailProvider   | Nodemailer    |
| test        | SmtpEmailProvider   | Nodemailer    |
| staging     | SmtpEmailProvider   | Nodemailer    |
| production  | SesEmailProvider    | AWS SDK v3    |

## Environment Variables

### Common

```env
EMAIL_FROM=noreply@example.com
```

### SMTP (Development / Test / Staging)

```env
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<IAM_SMTP_USERNAME>
SMTP_PASS=<IAM_SMTP_PASSWORD>
```

### SES (Production)

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<IAM_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<IAM_SECRET_KEY>
```

In production on EC2/ECS/Lambda, use IAM execution roles instead of hardcoded keys. The SDK will auto-discover credentials from the environment.

### Queue / Redis (Optional)

```env
EMAIL_QUEUE_ENABLED=false         # Set true to use BullMQ queue
EMAIL_QUEUE_NAME=email-delivery   # Queue name (default)
REDIS_URL=redis://localhost:6379  # Redis connection string
```

Requires `npm install bullmq` (optional dependency).

### Rate Limiting

```env
EMAIL_RATE_LIMIT_PRODUCTION=50     # Max emails per minute in production
EMAIL_RATE_LIMIT_DEVELOPMENT=10    # Max emails per minute in dev/test
```

### Circuit Breaker

```env
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5    # Consecutive failures before opening
CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS=60000  # Time before half-open (ms)
```

### Attachment Validation

```env
ATTACHMENT_MAX_SIZE_MB=10
ATTACHMENT_ALLOWED_TYPES=application/pdf,image/png,image/jpeg,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv
```

## Usage

### Basic

```js
const emailModule = require("./src/email");

// Send email with infrastructure (rate limiter + circuit breaker + metrics)
await emailModule.sendEmailWithInfrastructure({
  to: "user@example.com",
  subject: "Hello",
  html: "<h1>Welcome</h1>",
});

// Send raw email (bypasses rate limiter and circuit breaker)
await emailModule.sendEmail({
  to: "user@example.com",
  subject: "Hello",
  html: "<h1>Welcome</h1>",
});

// Send templated emails
await emailModule.sendWelcomeEmail({ to: "user@example.com", name: "John Doe" });
await emailModule.sendPasswordResetEmail({ to: "user@example.com", name: "John", resetLink: "https://..." });
await emailModule.sendOTPEmail({ to: "user@example.com", otp: "123456", name: "John" });
await emailModule.sendJobApplicationConfirmation({ to: "candidate@example.com", name: "Jane", jobTitle: "Engineer", companyName: "Acme" });
```

### Using the Service Directly

```js
const { EmailProviderFactory, EmailService } = require("./src/email");

const provider = EmailProviderFactory.createProvider();
const service = new EmailService(provider);

await service.sendEmail({ to, subject, html });
await service.sendWelcomeEmail({ to, name });
await service.sendPasswordResetEmail({ to, name, resetLink });
await service.sendOTPEmail({ to, name, otp });
await service.sendJobApplicationConfirmation({ to, name, jobTitle, companyName });
```

### Verify Connection

```js
const service = emailModule.getEmailService();
await service.verifyConnection();
```

### With Queue (if enabled)

```js
const emailModule = require("./src/email");

// Queue is used automatically when EMAIL_QUEUE_ENABLED=true
// Falls back to immediate delivery if bullmq is not installed
const result = await emailModule.sendEmail({
  to: "user@example.com",
  subject: "Queued email",
  html: "<p>Hello</p>",
});
// result: { immediate: false, jobId: "..." } or { immediate: true, result: null }
```

### Template Validation

```js
const { validateTemplate, fillTemplate } = require("./src/email");

// Validate a template string
const issues = validateTemplate("Hello ${name}, your code is ${code}", { name: "John" });
// returns [{ type: "missing", placeholder: "code" }]

// Fill a template (throws TemplateValidationError if placeholders missing)
const html = fillTemplate("html-template", "<p>Hi ${name}</p>", { name: "Jane" });
```

### Attachment Validation

```js
const { validateAttachments, setVirusScanHook } = require("./src/email");

// Validate attachments
const issues = validateAttachments([
  { filename: "resume.pdf", content: Buffer.from("..."), contentType: "application/pdf" }
]);

// Register a virus scan hook
setVirusScanHook(async (file) => {
  // return true if safe, throw if infected
});
```

### Metrics

```js
const { incrementCounter, recordSendDuration, generatePrometheusOutput } = require("./src/email");

incrementCounter("email_sent_total", { provider: "ses" });
recordSendDuration(150); // duration in ms
const prometheus = generatePrometheusOutput();
```

### Diagnostics

```js
const { checkSesSandboxStatus } = require("./src/email/diagnostics/sandbox");
const { checkProductionReadiness } = require("./src/email/diagnostics/productionReadiness");

const sandbox = await checkSesSandboxStatus(new SesEmailProvider());
// { sandbox: true, maxSendRate: 1, max24HourSend: 200 }

const readiness = await checkProductionReadiness(new SesEmailProvider());
// { ready: false, issues: [...], recommendations: [...] }
```

## API Endpoints

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| POST   | `/api/v1/email/send`          | Send raw email           |
| POST   | `/api/v1/email/welcome`       | Send welcome email       |
| POST   | `/api/v1/email/password-reset`| Send password reset      |
| POST   | `/api/v1/email/otp`           | Send OTP code            |
| POST   | `/api/v1/email/application-confirmation` | Application confirmation |
| GET    | `/api/v1/email/verify`        | Test provider connection |
| GET    | `/api/v1/email/status`        | Current system status (provider, env, sandbox, circuit breaker, rate limiter) |
| GET    | `/api/v1/email/health`        | Health check with diagnostics (200/503) |
| GET    | `/api/v1/email/metrics`       | Prometheus (default) or JSON metrics (`?format=json`) |
| GET    | `/api/v1/email/readiness`     | Production SES readiness check (identity, DKIM, MAIL FROM) |

### Status Response (GET /status)

```json
{
  "success": true,
  "data": {
    "provider": "SmtpEmailProvider",
    "environment": "development",
    "sandbox": true,
    "sesIdentityVerified": false,
    "rateLimiter": { "enabled": true, "currentTokens": 10, "maxPerWindow": 10 },
    "circuitBreaker": { "state": "CLOSED", "failureCount": 0, "failureThreshold": 5 }
  }
}
```

### Health Response (GET /health)

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "provider": "SmtpEmailProvider",
    "providerConnected": true,
    "senderIdentityVerified": false,
    "enabled": true,
    "circuitBreakerState": "CLOSED",
    "metrics": { "sent": 10, "failed": 0, "retried": 1, "rateLimited": 0, "circuitOpens": 0 },
    "warnings": ["Sender email identity not verified"],
    "timestamp": "2026-06-16T12:00:00.000Z"
  }
}
```

### Metrics Response (GET /metrics)

Default (Prometheus format):
```
# HELP email_sent_total Total emails sent
# TYPE email_sent_total counter
email_sent_total{provider="SmtpEmailProvider"} 10
# HELP email_failed_total Total email send failures
# TYPE email_failed_total counter
email_failed_total{provider="SmtpEmailProvider"} 0
...
```

JSON format (`?format=json`):
```json
{
  "counters": { "email_sent_total": 10, "email_failed_total": 0 },
  "histograms": { "send_duration_ms": { "count": 10, "sum": 1520, "avg": 152, "p95": 280 } }
}
```

## Retry Behavior

- **Transient errors** (throttling, timeouts, 5xx): retries up to 3 times with exponential backoff (1s → 2s → 4s) + jitter
- **Permanent errors** (invalid address, bad params): no retry, throws immediately
- Maximum delay capped at 30s

## Circuit Breaker

- **CLOSED**: Normal operation. Failures increment a counter.
- **OPEN**: After `failureThreshold` consecutive failures (default 5). All calls fail fast with `EmailDeliveryError` (code `CIRCUIT_OPEN_ERROR`).
- **HALF_OPEN**: After `recoveryTimeout` (default 60s). One test request is allowed through.
  - If it succeeds → back to **CLOSED**.
  - If it fails → back to **OPEN**.
- Callers should use `sendEmailWithInfrastructure()` to automatically wrap calls with the circuit breaker.

## Rate Limiter

- Token bucket algorithm: tokens refill continuously over a 60-second window.
- Default limits: 10/min in development, 50/min in production.
- When exceeded, throws `EmailDeliveryError` with code `EMAIL_THROTTLING_ERROR`.
- Use `sendEmailWithInfrastructure()` to automatically apply rate limiting.

## Queue (Optional)

- Requires `bullmq` package (`npm install bullmq`).
- When `EMAIL_QUEUE_ENABLED=true`, emails are sent via BullMQ Queue + Worker.
- Falls back to immediate (synchronous) delivery if bullmq is not installed.
- Graceful degradation: if Redis is unavailable, falls back to immediate mode.

## Error Handling

All errors are wrapped in `EmailDeliveryError` with:
- `code` — machine-readable error code (`EMAIL_DELIVERY_ERROR`, `EMAIL_CONFIG_ERROR`, `EMAIL_VALIDATION_ERROR`, `EMAIL_TRANSPORT_ERROR`, `EMAIL_THROTTLING_ERROR`, `CIRCUIT_OPEN_ERROR`, `TEMPLATE_ERROR`, `ATTACHMENT_ERROR`)
- `cause` — original error (if any)
- `recipient` — masked recipient email
- `subject` — email subject
- `timestamp` — ISO timestamp

Additional error types:
- `TemplateValidationError` — missing placeholders, unused variables, template name
- `AttachmentValidationError` — disallowed MIME type, oversized, virus detected

Secrets (SMTP passwords, AWS keys) are never logged. Recipient emails are masked in logs.

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests (requires SMTP or AWS credentials)
npm run test:integration

# All tests
npm test

# With coverage
npm run test:coverage

# Run specific test suite
npx jest tests/unit/email/circuitBreaker/
npx jest tests/unit/email/rateLimiter/
```

## Vercel Deployment

1. Add all env vars in Vercel Dashboard → Project Settings → Environment Variables
2. The module is serverless-safe — no singletons that persist across invocations
3. Each invocation creates a fresh provider via `getEmailService()`
4. AWS SDK v3 clients are lightweight and acceptable to create per-request
5. BullMQ queue is not available in serverless — EMAIL_QUEUE_ENABLED should be false

## Production AWS Deployment

Option 1 — IAM User Keys:

```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
EMAIL_FROM=developer.mavenjobs01@gmail.com
```

Option 2 — IAM Role (recommended):

Attach a policy with `ses:SendEmail` and `ses:GetSendQuota` to the EC2/Lambda execution role. No keys needed — the SDK auto-discovers credentials.

Minimum IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:GetSendQuota",
        "ses:GetIdentityVerificationAttributes",
        "ses:GetIdentityDkimAttributes",
        "ses:GetIdentityMailFromDomainAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

For production readiness diagnostics, additional SES read permissions are required.

## Backward Compatibility

The original `src/services/email.service.js` is preserved and continues to export the same API, delegating to the new module internally. Existing code that imports it continues to work unchanged.
