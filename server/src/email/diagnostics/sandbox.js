const logger = require("../../config/logger");

async function checkSesSandboxStatus(sesProvider) {
  const result = {
    sandbox: true,
    details: null,
    error: null,
  };

  try {
    const client = sesProvider._getClient();
    const { GetSendQuotaCommand } = require("@aws-sdk/client-ses");

    const command = new GetSendQuotaCommand({});
    const quota = await client.send(command);

    const max24HourSend = quota.Max24HourSend || 0;
    const maxSendRate = quota.MaxSendRate || 0;

    result.sandbox = maxSendRate <= 1 && max24HourSend <= 200;
    result.details = {
      max24HourSend: quota.Max24HourSend,
      maxSendRate: quota.MaxSendRate,
      sentLast24Hours: quota.SentLast24Hours,
    };

    logger.info("[email:sandbox] SES quota check complete", {
      sandbox: result.sandbox,
      maxSendRate: quota.MaxSendRate,
      max24HourSend: quota.Max24HourSend,
    });
  } catch (error) {
    logger.warn("[email:sandbox] Could not check SES quota", {
      error: error.message,
    });
    result.error = error.message;
  }

  return result;
}

function inferSandboxFromEnv() {
  const env = (process.env.NODE_ENV || "development").toLowerCase();

  if (env !== "production") {
    return {
      sandbox: null,
      note: "Sandbox status only applies to production SES. Run GET /api/v1/email/status in production to check.",
    };
  }

  return {
    sandbox: null,
    note: "Run check against SES API to determine sandbox status. Requires SES GetSendQuota permission.",
  };
}

module.exports = { checkSesSandboxStatus, inferSandboxFromEnv };
