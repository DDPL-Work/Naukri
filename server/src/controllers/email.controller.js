const emailModule = require("../email");
const { checkSesSandboxStatus } = require("../email/diagnostics/sandbox");
const {
  checkSesProductionReadiness,
  validateEnvSetup,
} = require("../email/diagnostics/productionReadiness");

const EXTRA_FIELDS = process.env.NODE_ENV !== "production" ? ["stack"] : [];

function sanitizeError(error) {
  const safe = {
    message: error.message,
    code: error.code || error.name,
    timestamp: error.timestamp,
  };
  if (EXTRA_FIELDS.includes("stack") && error.stack) {
    safe.stack = error.stack;
  }
  return safe;
}

async function sendEmail(req, res, next) {
  try {
    const { to, subject, html, text, attachments } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: "Recipient (to) and subject are required",
      });
    }

    const result = await emailModule.sendEmail({ to, subject, html, text, attachments });

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(error.code === "EMAIL_RATE_LIMIT_ERROR" ? 429 : 500).json({
      success: false,
      message: "Failed to send email",
      error: sanitizeError(error),
    });
  }
}

async function sendWelcomeEmail(req, res, next) {
  try {
    const { to, name } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Recipient email (to) is required",
      });
    }

    const result = await emailModule.sendWelcomeEmail({ to, name });

    res.status(200).json({
      success: true,
      message: "Welcome email sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send welcome email",
      error: sanitizeError(error),
    });
  }
}

async function sendPasswordResetEmail(req, res, next) {
  try {
    const { to, name, resetLink } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Recipient email (to) is required",
      });
    }

    const result = await emailModule.sendPasswordResetEmail({ to, name, resetLink });

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: sanitizeError(error),
    });
  }
}

async function sendOTPEmail(req, res, next) {
  try {
    const { to, name, otp } = req.body;

    if (!to || !otp) {
      return res.status(400).json({
        success: false,
        message: "Recipient email (to) and OTP are required",
      });
    }

    const result = await emailModule.sendOTPEmail({ to, name, otp });

    res.status(200).json({
      success: true,
      message: "OTP email sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send OTP email",
      error: sanitizeError(error),
    });
  }
}

async function sendApplicationConfirmation(req, res, next) {
  try {
    const { to, name, jobTitle, companyName } = req.body;

    if (!to || !jobTitle || !companyName) {
      return res.status(400).json({
        success: false,
        message: "Recipient email (to), jobTitle, and companyName are required",
      });
    }

    const result = await emailModule.sendJobApplicationConfirmation({
      to, name, jobTitle, companyName,
    });

    res.status(200).json({
      success: true,
      message: "Application confirmation email sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send application confirmation email",
      error: sanitizeError(error),
    });
  }
}

async function verifyConnection(req, res, next) {
  try {
    const service = emailModule.getEmailService();
    await service.verifyConnection();

    res.status(200).json({
      success: true,
      message: "Email provider connection verified successfully",
      provider: process.env.NODE_ENV === "production" ? "ses" : "smtp",
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Email provider connection failed",
      error: sanitizeError(error),
    });
  }
}

async function getStatus(req, res, next) {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    const isProduction = env === "production";

    const smtpConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );
    const sesConfigured = Boolean(
      (process.env.AWS_REGION || process.env.AWS_SES_REGION) &&
      (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL)
    );

    let sandboxStatus = null;
    let verifiedIdentity = null;

    if (isProduction && sesConfigured) {
      try {
        const provider = emailModule.SesEmailProvider
          ? emailModule.EmailProviderFactory.createSesProvider()
          : null;
        if (provider) {
          sandboxStatus = await (provider);
          const readiness = await checkSesProductionReadiness(provider);
          verifiedIdentity = {
            verified: readiness.identityVerified,
            email: readiness.fromEmail,
            dkimEnabled: readiness.dkimEnabled,
            mailFromConfigured: readiness.mailFromConfigured,
          };
        }
      } catch (diagErr) {
        sandboxStatus = { error: diagErr.message };
      }
    }

    const cb = emailModule._getCircuitBreaker
      ? emailModule._getCircuitBreaker().getStatus()
      : null;

    const rl = emailModule._getRateLimiter
      ? emailModule._getRateLimiter().getStatus()
      : null;

    res.status(200).json({
      provider: isProduction ? "ses" : "smtp",
      region: process.env.AWS_REGION || process.env.AWS_SES_REGION || null,
      environment: env,
      sandbox: sandboxStatus,
      verifiedIdentity,
      smtpConfigured,
      sesConfigured,
      queueEnabled: process.env.EMAIL_QUEUE_ENABLED === "true",
      rateLimiter: rl,
      circuitBreaker: cb,
      emailFrom: (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || "").replace(/(.).*@/, "$1***@"),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get email status",
      error: sanitizeError(error),
    });
  }
}

async function getHealth(req, res, next) {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    const isProduction = env === "production";
    const diagnostics = [];
    const warnings = [];

    let providerConnected = false;
    let providerError = null;

    try {
      const service = emailModule.getEmailService({ forceNew: true });
      await service.verifyConnection();
      providerConnected = true;
      diagnostics.push("Provider connection: OK");
    } catch (connErr) {
      providerError = connErr.message;
      diagnostics.push(`Provider connection: FAILED (${connErr.message})`);
    }

    const smtpConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );
    const sesConfigured = Boolean(
      (process.env.AWS_REGION || process.env.AWS_SES_REGION) &&
      (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL)
    );

    if (isProduction) {
      if (sesConfigured) {
        diagnostics.push("SES configuration: OK");
      } else {
        warnings.push("SES configuration: INCOMPLETE — set AWS_REGION and EMAIL_FROM");
      }
    } else {
      if (smtpConfigured) {
        diagnostics.push("SMTP configuration: OK");
      } else {
        warnings.push("SMTP configuration: INCOMPLETE — set SMTP_HOST, SMTP_USER, SMTP_PASS");
      }
    }

    if (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL) {
      diagnostics.push("Sender identity: configured");
    } else {
      warnings.push("Sender identity: NOT CONFIGURED — set EMAIL_FROM");
    }

    const cb = emailModule._getCircuitBreaker
      ? emailModule._getCircuitBreaker().getStatus()
      : null;

    if (cb && cb.isOpen) {
      warnings.push("Circuit breaker: OPEN — provider is currently bypassed");
    }

    const rl = emailModule._getRateLimiter
      ? emailModule._getRateLimiter().getStatus()
      : null;

    const allOk = providerConnected && !(cb && cb.isOpen);

    res.status(allOk ? 200 : 503).json({
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      provider: isProduction ? "ses" : "smtp",
      providerConnected,
      providerError,
      queueEnabled: process.env.EMAIL_QUEUE_ENABLED === "true",
      diagnostics,
      warnings,
      circuitBreaker: cb,
      rateLimiter: rl ? { tokensRemaining: rl.tokensRemaining, maxPerWindow: rl.maxPerWindow } : null,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      message: "Health check failed",
      error: sanitizeError(error),
    });
  }
}

async function getMetrics(req, res, next) {
  try {
    const format = req.query.format || "prometheus";

    if (format === "json") {
      const metrics = await emailModule.generateJsonMetrics();
      return res.status(200).json(metrics);
    }

    const promOutput = await emailModule.generatePrometheusOutput();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(promOutput);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get metrics",
      error: sanitizeError(error),
    });
  }
}

async function getProductionReadiness(req, res, next) {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    const isProduction = env === "production";

    const envValidation = validateEnvSetup();

    if (!isProduction) {
      return res.status(200).json({
        environment: env,
        productionAccess: false,
        message: "Production readiness checks only apply in NODE_ENV=production",
        envSetup: envValidation,
      });
    }

    const provider = emailModule.EmailProviderFactory.createSesProvider();
    const readiness = await checkSesProductionReadiness(provider);

    const overallReady =
      readiness.identityVerified &&
      readiness.productionAccess;

    res.status(200).json({
      environment: env,
      productionAccess: readiness.productionAccess,
      overallReady,
      details: {
        fromEmail: readiness.fromEmail,
        region: readiness.region,
        identityVerified: readiness.identityVerified,
        dkimEnabled: readiness.dkimEnabled,
        mailFromConfigured: readiness.mailFromConfigured,
        verifiedIdentities: readiness.verifiedIdentities,
      },
      recommendations: readiness.recommendations,
      errors: readiness.errors,
      envSetup: envValidation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check production readiness",
      error: sanitizeError(error),
    });
  }
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendApplicationConfirmation,
  verifyConnection,
  getStatus,
  getHealth,
  getMetrics,
  getProductionReadiness,
};
