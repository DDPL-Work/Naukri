const logger = require("../../config/logger");
const EmailDeliveryError = require("../errors/EmailDeliveryError");

let _bull = null;
try {
  _bull = require("bullmq");
} catch {
  _bull = null;
}

const EMAIL_QUEUE_ENABLED = process.env.EMAIL_QUEUE_ENABLED === "true";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class EmailQueue {
  constructor(options = {}) {
    this._enabled = options.enabled !== undefined ? options.enabled : EMAIL_QUEUE_ENABLED;
    this._queue = null;
    this._worker = null;
    this._processor = options.processor || null;
    this._initialized = false;
    this._name = options.name || process.env.EMAIL_QUEUE_NAME || "email-delivery";
  }

  get enabled() {
    return this._enabled;
  }

  get name() {
    return this._name;
  }

  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    if (!this._enabled) {
      logger.info("[email:queue] Queue mode is disabled, using immediate delivery");
      return;
    }

    if (!_bull) {
      logger.warn("[email:queue] bullmq is not installed. Install it with: npm install bullmq");
      logger.info("[email:queue] Falling back to immediate delivery");
      this._enabled = false;
      return;
    }

    try {
      const url = process.env.REDIS_URL || REDIS_URL;

      const connection = {
        url,
        maxRetriesPerRequest: null,
      };

      this._queue = new _bull.Queue(this._name, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      if (this._processor) {
        this._worker = new _bull.Worker(this._name, this._processor, {
          connection,
          concurrency: 5,
        });

        this._worker.on("completed", (job) => {
          logger.info(`[email:queue] Job ${job.id} completed`, {
            queue: this._name,
            jobId: job.id,
          });
        });

        this._worker.on("failed", (job, error) => {
          logger.error(`[email:queue] Job ${job.id} failed`, {
            queue: this._name,
            jobId: job.id,
            error: error.message,
          });
        });
      }

      logger.info(`[email:queue] Initialized queue "${this._name}"`, {
        redisUrl: url.replace(/\/\/.*@/, "//***@"),
        hasWorker: Boolean(this._processor),
      });
    } catch (error) {
      logger.error(`[email:queue] Failed to initialize: ${error.message}`);
      this._enabled = false;
    }
  }

  async add(emailOptions, jobOptions = {}) {
    if (!this._enabled || !this._queue) {
      return { immediate: true, result: null };
    }

    const job = await this._queue.add("send-email", emailOptions, {
      ...jobOptions,
      timestamp: Date.now(),
    });

    logger.info(`[email:queue] Job ${job.id} added to queue`, {
      queue: this._name,
      jobId: job.id,
      to: Array.isArray(emailOptions.to)
        ? emailOptions.to.map((t) => t.replace(/(.).*@/, "$1***@"))
        : String(emailOptions.to || "").replace(/(.).*@/, "$1***@"),
      subject: emailOptions.subject,
    });

    return { immediate: false, jobId: job.id };
  }

  async getQueueDepth() {
    if (!this._queue) return 0;
    try {
      const counts = await this._queue.getJobCounts("waiting", "active", "delayed");
      return (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
    } catch {
      return -1;
    }
  }

  async close() {
    if (this._worker) {
      await this._worker.close();
      this._worker = null;
    }
    if (this._queue) {
      await this._queue.close();
      this._queue = null;
    }
    this._initialized = false;
    this._enabled = EMAIL_QUEUE_ENABLED === "true";
    logger.info("[email:queue] Queue closed");
  }

  async obliterate() {
    if (this._queue) {
      await this._queue.obliterate({ force: true });
      logger.info(`[email:queue] Queue "${this._name}" obliterated`);
    }
  }
}

module.exports = EmailQueue;
