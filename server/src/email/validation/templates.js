const TemplateValidationError = require("../errors/TemplateValidationError");
const logger = require("../../config/logger");

const PLACEHOLDER_PATTERN = /\$\{(\w+)\}/g;

function extractPlaceholders(template) {
  if (typeof template !== "string") return [];
  const placeholders = new Set();
  let match;
  while ((match = PLACEHOLDER_PATTERN.exec(template)) !== null) {
    placeholders.add(match[1]);
  }
  return [...placeholders];
}

function validateTemplate(template, variables, options = {}) {
  const templateName = options.templateName || "unknown";
  const required = options.required || [];

  if (typeof template !== "string") {
    throw new TemplateValidationError("Template must be a string", {
      templateName,
    });
  }

  if (!variables || typeof variables !== "object") {
    throw new TemplateValidationError("Variables must be an object", {
      templateName,
    });
  }

  const placeholders = extractPlaceholders(template);

  const missing = required.filter(
    (key) => variables[key] === undefined || variables[key] === null
  );

  const missingFromTemplate = placeholders.filter(
    (key) => variables[key] === undefined || variables[key] === null
  );

  const allMissing = [...new Set([...missing, ...missingFromTemplate])];

  const extraVars = Object.keys(variables).filter(
    (key) => !placeholders.includes(key)
  );

  const errors = [];

  if (allMissing.length > 0) {
    errors.push(
      new TemplateValidationError(
        `Template "${templateName}" has missing placeholders: ${allMissing.join(", ")}`,
        {
          templateName,
          missingPlaceholders: allMissing,
        }
      )
    );
  }

  if (extraVars.length > 0 && options.strict) {
    errors.push(
      new TemplateValidationError(
        `Template "${templateName}" received unused variables: ${extraVars.join(", ")}`,
        {
          templateName,
          extraVariables: extraVars,
        }
      )
    );
  }

  return errors;
}

function fillTemplate(template, variables, options = {}) {
  const errors = validateTemplate(template, variables, options);

  if (errors.length > 0) {
    const firstError = errors.find(
      (e) => e.missingPlaceholders && e.missingPlaceholders.length > 0
    );
    if (firstError) {
      throw firstError;
    }
  }

  return template.replace(PLACEHOLDER_PATTERN, (match, key) => {
    if (variables[key] !== undefined && variables[key] !== null) {
      return String(variables[key]);
    }
    return match;
  });
}

function checkTemplateHtml(html, variables, options = {}) {
  return validateTemplate(html, variables, {
    ...options,
    templateName: options.templateName || "html-template",
  });
}

module.exports = {
  extractPlaceholders,
  validateTemplate,
  fillTemplate,
  checkTemplateHtml,
  PLACEHOLDER_PATTERN,
};
