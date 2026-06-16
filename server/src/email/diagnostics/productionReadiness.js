const logger = require("../../config/logger");
const EmailDeliveryError = require("../errors/EmailDeliveryError");

async function checkSesProductionReadiness(sesProvider) {
  const fromEmail = sesProvider._config.from;
  const client = sesProvider._getClient();

  const results = {
    fromEmail,
    region: sesProvider._config.region,
    identityVerified: false,
    dkimEnabled: false,
    mailFromConfigured: false,
    productionAccess: false,
    verifiedIdentities: [],
    recommendations: [],
    errors: [],
  };

  try {
    const { GetIdentityVerificationAttributesCommand } = require("@aws-sdk/client-ses");
    const identityCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [fromEmail],
    });
    const identityResult = await client.send(identityCommand);
    const attrs = identityResult.VerificationAttributes || {};

    if (attrs[fromEmail]) {
      const status = attrs[fromEmail].VerificationStatus;
      results.identityVerified = status === "Success";
      results.verifiedIdentities.push({
        email: fromEmail,
        status,
        verificationToken: attrs[fromEmail].VerificationToken || null,
      });
    }
  } catch (error) {
    results.errors.push(`Identity check failed: ${error.message}`);
    logger.warn("[email:readiness] Identity verification check failed", {
      error: error.message,
    });
  }

  try {
    const { GetIdentityDkimAttributesCommand } = require("@aws-sdk/client-ses");
    const dkimCommand = new GetIdentityDkimAttributesCommand({
      Identities: [fromEmail],
    });
    const dkimResult = await client.send(dkimCommand);
    const dkimAttrs = dkimResult.DkimAttributes || {};

    if (dkimAttrs[fromEmail]) {
      results.dkimEnabled = dkimAttrs[fromEmail].DkimEnabled;
    }
  } catch (error) {
    results.errors.push(`DKIM check failed: ${error.message}`);
  }

  try {
    const { GetIdentityMailFromDomainAttributesCommand } = require("@aws-sdk/client-ses");
    const mailFromCommand = new GetIdentityMailFromDomainAttributesCommand({
      Identities: [fromEmail],
    });
    const mailFromResult = await client.send(mailFromCommand);
    const mailFromAttrs = mailFromResult.MailFromDomainAttributes || {};

    if (mailFromAttrs[fromEmail]) {
      const attr = mailFromAttrs[fromEmail];
      results.mailFromConfigured = attr.MailFromDomain !== null;
    }
  } catch (error) {
    results.errors.push(`MAIL FROM check failed: ${error.message}`);
  }

  try {
    const { GetSendQuotaCommand } = require("@aws-sdk/client-ses");
    const quotaResult = await client.send(new GetSendQuotaCommand({}));
    const sendRate = quotaResult.MaxSendRate || 0;
    results.productionAccess = sendRate > 1;
  } catch (error) {
    results.errors.push(`Send quota check failed: ${error.message}`);
  }

  if (!results.identityVerified) {
    results.recommendations.push(
      `Verify the sender email "${fromEmail}" in AWS SES Console. ` +
      "AWS will send a verification email to that address."
    );
  }

  if (!results.dkimEnabled) {
    results.recommendations.push(
      "Enable DKIM signing for your sending domain to improve deliverability. " +
      "Add the DKIM CNAME records provided by SES to your DNS configuration."
    );
  }

  if (!results.mailFromConfigured) {
    results.recommendations.push(
      "Configure a custom MAIL FROM domain to reduce bounce handling delays. " +
      "Set it in the AWS SES Console under Domains > your-domain > MAIL FROM."
    );
  }

  if (!results.productionAccess) {
    results.recommendations.push(
      "Request production access for SES. Without it, you can only send to verified addresses. " +
      "Submit a request in the AWS Support Center."
    );
  }

  return results;
}

function validateEnvSetup() {
  const issues = [];
  const warnings = [];

  const env = (process.env.NODE_ENV || "development").toLowerCase();

  if (env === "production") {
    if (!process.env.AWS_REGION && !process.env.AWS_SES_REGION) {
      issues.push("AWS_REGION is not set");
    }
    if (!process.env.EMAIL_FROM && !process.env.AWS_SES_FROM_EMAIL) {
      issues.push("EMAIL_FROM is not set");
    }
  } else {
    if (!process.env.SMTP_HOST) {
      warnings.push("SMTP_HOST is not set. Emails will fail in development.");
    }
    if (!process.env.SMTP_USER) {
      warnings.push("SMTP_USER is not set. Emails will fail in development.");
    }
    if (!process.env.SMTP_PASS) {
      warnings.push("SMTP_PASS is not set. Emails will fail in development.");
    }
    if (!process.env.EMAIL_FROM) {
      warnings.push("EMAIL_FROM is not set. Emails will fail in development.");
    }
  }

  return { issues, warnings };
}

module.exports = { checkSesProductionReadiness, validateEnvSetup };
