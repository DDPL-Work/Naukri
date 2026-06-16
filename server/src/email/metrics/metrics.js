const logger = require("../../config/logger");

const counters = {
  emailsSentTotal: 0,
  emailsFailedTotal: 0,
  providerFailuresTotal: 0,
  retriesTotal: 0,
  rateLimitedTotal: 0,
  circuitBreakerOpensTotal: 0,
};

const timings = {
  sendDurationsMs: [],
  maxTimingsSamples: 100,
};

const APP_NAME = (process.env.APP_NAME || "maven_crm_qr")
  .toLowerCase()
  .replace(/[^a-z0-9_]/g, "_");
const NODE_ENV = process.env.NODE_ENV || "development";

function incrementCounter(name, value = 1) {
  if (name in counters) {
    counters[name] += value;
  }
}

function recordSendDuration(durationMs) {
  timings.sendDurationsMs.push(durationMs);
  if (timings.sendDurationsMs.length > timings.maxTimingsSamples) {
    timings.sendDurationsMs.shift();
  }
}

function getAverageSendDuration() {
  if (timings.sendDurationsMs.length === 0) return 0;
  const sum = timings.sendDurationsMs.reduce((a, b) => a + b, 0);
  return Math.round((sum / timings.sendDurationsMs.length) * 100) / 100;
}

function getP95SendDuration() {
  if (timings.sendDurationsMs.length === 0) return 0;
  const sorted = [...timings.sendDurationsMs].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

async function getQueueDepth(queue) {
  if (queue && typeof queue.getQueueDepth === "function") {
    return queue.getQueueDepth();
  }
  return -1;
}

function getCounterSnapshot() {
  return { ...counters };
}

function resetMetrics() {
  Object.keys(counters).forEach((key) => {
    counters[key] = 0;
  });
  timings.sendDurationsMs = [];
}

async function generatePrometheusOutput(queue) {
  const queueDepth = await getQueueDepth(queue);
  const avgDuration = getAverageSendDuration();
  const p95Duration = getP95SendDuration();
  const c = counters;

  const lines = [
    `# HELP email_emails_sent_total Total number of emails sent`,
    `# TYPE email_emails_sent_total counter`,
    `email_emails_sent_total{app="${APP_NAME}",env="${NODE_ENV}"} ${c.emailsSentTotal}`,
    ``,
    `# HELP email_emails_failed_total Total number of email failures`,
    `# TYPE email_emails_failed_total counter`,
    `email_emails_failed_total{app="${APP_NAME}",env="${NODE_ENV}"} ${c.emailsFailedTotal}`,
    ``,
    `# HELP email_provider_failures_total Total provider-level failures`,
    `# TYPE email_provider_failures_total counter`,
    `email_provider_failures_total{app="${APP_NAME}",env="${NODE_ENV}"} ${c.providerFailuresTotal}`,
    ``,
    `# HELP email_retries_total Total retry attempts`,
    `# TYPE email_retries_total counter`,
    `email_retries_total{app="${APP_NAME}",env="${NODE_ENV}"} ${c.retriesTotal}`,
    ``,
    `# HELP email_rate_limited_total Total rate-limited requests`,
    `# TYPE email_rate_limited_total counter`,
    `email_rate_limited_total{app="${APP_NAME}",env="${NODE_ENV}"} ${c.rateLimitedTotal}`,
    ``,
    `# HELP email_circuit_breaker_opens_total Total circuit breaker transitions to OPEN`,
    `# TYPE email_circuit_breaker_opens_total counter`,
    `email_circuit_breaker_opens_total{app="${APP_NAME}",env="${NODE_ENV}"} ${c.circuitBreakerOpensTotal}`,
    ``,
    `# HELP email_queue_depth Current number of jobs in queue`,
    `# TYPE email_queue_depth gauge`,
    `email_queue_depth{app="${APP_NAME}",env="${NODE_ENV}"} ${queueDepth}`,
    ``,
    `# HELP email_average_send_duration_ms Average email send duration in ms`,
    `# TYPE email_average_send_duration_ms gauge`,
    `email_average_send_duration_ms{app="${APP_NAME}",env="${NODE_ENV}"} ${avgDuration}`,
    ``,
    `# HELP email_p95_send_duration_ms P95 email send duration in ms`,
    `# TYPE email_p95_send_duration_ms gauge`,
    `email_p95_send_duration_ms{app="${APP_NAME}",env="${NODE_ENV}"} ${p95Duration}`,
    ``,
  ];

  return lines.join("\n");
}

async function generateJsonMetrics(queue) {
  const queueDepth = await getQueueDepth(queue);
  const c = counters;

  return {
    emails_sent_total: c.emailsSentTotal,
    emails_failed_total: c.emailsFailedTotal,
    provider_failures_total: c.providerFailuresTotal,
    retries_total: c.retriesTotal,
    rate_limited_total: c.rateLimitedTotal,
    circuit_breaker_opens_total: c.circuitBreakerOpensTotal,
    queue_depth: queueDepth,
    average_send_duration_ms: getAverageSendDuration(),
    p95_send_duration_ms: getP95SendDuration(),
    timings_samples: timings.sendDurationsMs.length,
  };
}

module.exports = {
  incrementCounter,
  recordSendDuration,
  getAverageSendDuration,
  getP95SendDuration,
  getQueueDepth,
  getCounterSnapshot,
  resetMetrics,
  generatePrometheusOutput,
  generateJsonMetrics,
  counters,
  timings,
};
