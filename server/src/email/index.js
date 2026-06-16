const EmailProvider = require("./providers/emailProvider");
const SmtpEmailProvider = require("./providers/smtpProvider");
const SesEmailProvider = require("./providers/sesProvider");
const EmailProviderFactory = require("./factory/emailProviderFactory");
const EmailService = require("./service/emailService");
const EmailDeliveryError = require("./errors/EmailDeliveryError");
const TemplateValidationError = require("./errors/TemplateValidationError");
const AttachmentValidationError = require("./errors/AttachmentValidationError");
const { withRetry, isTransientError } = require("./utils/retry");
const CircuitBreaker = require("./circuitBreaker/circuitBreaker");
const EmailQueue = require("./queue/emailQueue");
const { RateLimiter, getMaxEmailsPerMinute } = require("./rateLimiter/rateLimiter");
const {
  validateAttachments,
  validateAttachmentsWithVirusScan,
  setVirusScanHook,
  clearVirusScanHook,
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_SIZE_BYTES,
} = require("./validation/attachments");
const {
  validateTemplate,
  fillTemplate,
  extractPlaceholders,
  checkTemplateHtml,
} = require("./validation/templates");
const {
  incrementCounter,
  recordSendDuration,
  getCounterSnapshot,
  resetMetrics,
  generatePrometheusOutput,
  generateJsonMetrics,
} = require("./metrics/metrics");

let _serviceInstance = null;
let _circuitBreaker = null;
let _queue = null;
let _rateLimiter = null;

function _getCircuitBreaker() {
  if (!_circuitBreaker) {
    _circuitBreaker = new CircuitBreaker({
      name: "email-provider",
      failureThreshold: 5,
      recoveryTimeout: 60000,
    });
  }
  return _circuitBreaker;
}

function _getRateLimiter() {
  if (!_rateLimiter) {
    _rateLimiter = new RateLimiter();
  }
  return _rateLimiter;
}

function _getQueue(processor) {
  if (!_queue) {
    _queue = new EmailQueue({ processor });
  }
  return _queue;
}

function getEmailService(options = {}) {
  if (_serviceInstance && !options.forceNew) {
    return _serviceInstance;
  }

  const provider = EmailProviderFactory.createProvider(options);
  _serviceInstance = new EmailService(provider);
  return _serviceInstance;
}

function resetEmailService() {
  if (_serviceInstance) {
    _serviceInstance.close();
    _serviceInstance = null;
  }
  _circuitBreaker = null;
  _rateLimiter = null;
}

async function sendEmailWithInfrastructure(options) {
  const cb = _getCircuitBreaker();
  const rl = _getRateLimiter();

  await rl.consume(1);

  return cb.call(async () => {
    const service = getEmailService();
    const startTime = Date.now();

    const enrichedOptions = {
      ...options,
      onRetry: (retryInfo) => {
        incrementCounter("retriesTotal");
      },
    };

    if (options.attachments && options.attachments.length > 0) {
      const attErrors = validateAttachments(options.attachments);
      if (attErrors.length > 0) {
        incrementCounter("emailsFailedTotal");
        incrementCounter("providerFailuresTotal");
        throw attErrors[0];
      }
    }

    if (options.html) {
      const htmlErrors = checkTemplateHtml(options.html, {}, { strict: false });
      if (htmlErrors.length > 0) {
        incrementCounter("emailsFailedTotal");
        incrementCounter("providerFailuresTotal");
        throw htmlErrors[0];
      }
    }

    try {
      const result = await service.sendEmail(enrichedOptions);
      const duration = Date.now() - startTime;
      recordSendDuration(duration);
      incrementCounter("emailsSentTotal");
      return result;
    } catch (error) {
      incrementCounter("emailsFailedTotal");
      incrementCounter("providerFailuresTotal");
      throw error;
    }
  });
}

async function sendEmail(options) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === "true";

  if (queueEnabled) {
    const queue = _getQueue(null);
    if (!queue._initialized) {
      await queue.initialize();
    }
    if (queue.enabled) {
      return queue.add(options);
    }
  }

  return sendEmailWithInfrastructure(options);
}

async function sendWelcomeEmail(params) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === "true";

  if (queueEnabled) {
    const queue = _getQueue(null);
    if (!queue._initialized) {
      await queue.initialize();
    }
    if (queue.enabled) {
      return queue.add({ type: "welcome", ...params });
    }
  }

  const service = getEmailService();
  const cb = _getCircuitBreaker();
  const rl = _getRateLimiter();
  await rl.consume(1);

  return cb.call(async () => {
    const startTime = Date.now();
    try {
      const result = await service.sendWelcomeEmail(params);
      recordSendDuration(Date.now() - startTime);
      incrementCounter("emailsSentTotal");
      return result;
    } catch (error) {
      incrementCounter("emailsFailedTotal");
      incrementCounter("providerFailuresTotal");
      throw error;
    }
  });
}

async function sendPasswordResetEmail(params) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === "true";

  if (queueEnabled) {
    const queue = _getQueue(null);
    if (!queue._initialized) {
      await queue.initialize();
    }
    if (queue.enabled) {
      return queue.add({ type: "password-reset", ...params });
    }
  }

  const service = getEmailService();
  const cb = _getCircuitBreaker();
  const rl = _getRateLimiter();
  await rl.consume(1);

  return cb.call(async () => {
    const startTime = Date.now();
    try {
      const result = await service.sendPasswordResetEmail(params);
      recordSendDuration(Date.now() - startTime);
      incrementCounter("emailsSentTotal");
      return result;
    } catch (error) {
      incrementCounter("emailsFailedTotal");
      incrementCounter("providerFailuresTotal");
      throw error;
    }
  });
}

async function sendOTPEmail(params) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === "true";

  if (queueEnabled) {
    const queue = _getQueue(null);
    if (!queue._initialized) {
      await queue.initialize();
    }
    if (queue.enabled) {
      return queue.add({ type: "otp", ...params });
    }
  }

  const service = getEmailService();
  const cb = _getCircuitBreaker();
  const rl = _getRateLimiter();
  await rl.consume(1);

  return cb.call(async () => {
    const startTime = Date.now();
    try {
      const result = await service.sendOTPEmail(params);
      recordSendDuration(Date.now() - startTime);
      incrementCounter("emailsSentTotal");
      return result;
    } catch (error) {
      incrementCounter("emailsFailedTotal");
      incrementCounter("providerFailuresTotal");
      throw error;
    }
  });
}

async function sendJobApplicationConfirmation(params) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === "true";

  if (queueEnabled) {
    const queue = _getQueue(null);
    if (!queue._initialized) {
      await queue.initialize();
    }
    if (queue.enabled) {
      return queue.add({ type: "application-confirmation", ...params });
    }
  }

  const service = getEmailService();
  const cb = _getCircuitBreaker();
  const rl = _getRateLimiter();
  await rl.consume(1);

  return cb.call(async () => {
    const startTime = Date.now();
    try {
      const result = await service.sendJobApplicationConfirmation(params);
      recordSendDuration(Date.now() - startTime);
      incrementCounter("emailsSentTotal");
      return result;
    } catch (error) {
      incrementCounter("emailsFailedTotal");
      incrementCounter("providerFailuresTotal");
      throw error;
    }
  });
}

module.exports = {
  EmailProvider,
  SmtpEmailProvider,
  SesEmailProvider,
  EmailProviderFactory,
  EmailService,
  EmailDeliveryError,
  TemplateValidationError,
  AttachmentValidationError,
  withRetry,
  isTransientError,
  CircuitBreaker,
  EmailQueue,
  RateLimiter,
  getMaxEmailsPerMinute,
  validateAttachments,
  validateAttachmentsWithVirusScan,
  setVirusScanHook,
  clearVirusScanHook,
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_SIZE_BYTES,
  validateTemplate,
  fillTemplate,
  extractPlaceholders,
  checkTemplateHtml,
  incrementCounter,
  recordSendDuration,
  getCounterSnapshot,
  resetMetrics,
  generatePrometheusOutput,
  generateJsonMetrics,
  getEmailService,
  resetEmailService,
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendJobApplicationConfirmation,
  _getCircuitBreaker,
  _getRateLimiter,
  _getQueue,
};
