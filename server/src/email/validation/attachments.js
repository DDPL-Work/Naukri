const AttachmentValidationError = require("../errors/AttachmentValidationError");
const logger = require("../../config/logger");

const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

let _virusScanHook = null;

function setVirusScanHook(hookFn) {
  if (typeof hookFn !== "function") {
    throw new Error("Virus scan hook must be a function");
  }
  _virusScanHook = hookFn;
  logger.info("[email:attachments] Virus scan hook registered");
}

function clearVirusScanHook() {
  _virusScanHook = null;
  logger.info("[email:attachments] Virus scan hook cleared");
}

function getVirusScanHook() {
  return _virusScanHook;
}

function validateAttachments(attachments, options = {}) {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_MIME_TYPES;
  const maxSize = options.maxSize || DEFAULT_MAX_SIZE_BYTES;
  const errors = [];

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const index = i;

    if (att.content && att.path) {
      errors.push(
        new AttachmentValidationError(
          `Attachment at index ${index}: provide either content or path, not both`,
          { filename: att.filename }
        )
      );
      continue;
    }

    if (!att.filename && !att.content && !att.path) {
      errors.push(
        new AttachmentValidationError(
          `Attachment at index ${index}: filename, content, or path is required`,
        )
      );
      continue;
    }

    const contentType = att.contentType || _inferContentType(att.filename || "");

    if (contentType && allowedTypes.length > 0) {
      const isAllowed = allowedTypes.some(
        (t) => t.toLowerCase() === contentType.toLowerCase()
      );
      if (!isAllowed) {
        errors.push(
          new AttachmentValidationError(
            `Attachment "${att.filename || "unnamed"}" has disallowed content type: ${contentType}`,
            {
              filename: att.filename,
              contentType,
              allowedTypes,
            }
          )
        );
      }
    }

    if (att.content && Buffer.isBuffer(att.content) && att.content.length > maxSize) {
      errors.push(
        new AttachmentValidationError(
          `Attachment "${att.filename || "unnamed"}" exceeds maximum size of ${maxSize} bytes`,
          {
            filename: att.filename,
            size: att.content.length,
            maxSize,
          }
        )
      );
    }

    if (att.path && typeof att.path === "string" && att.path.length > 0) {
      const fs = require("fs");
      try {
        const stat = fs.statSync(att.path);
        if (stat.size > maxSize) {
          errors.push(
            new AttachmentValidationError(
              `Attachment "${att.filename || att.path}" exceeds maximum size of ${maxSize} bytes`,
              {
                filename: att.filename || att.path,
                size: stat.size,
                maxSize,
              }
            )
          );
        }
      } catch (statErr) {
        errors.push(
          new AttachmentValidationError(
            `Attachment "${att.filename || att.path}" cannot be accessed: ${statErr.message}`,
            { filename: att.filename || att.path }
          )
        );
      }
    }
  }

  return errors;
}

async function validateAttachmentsWithVirusScan(attachments, options = {}) {
  const validationErrors = validateAttachments(attachments, options);
  if (validationErrors.length > 0) {
    return validationErrors;
  }

  if (!_virusScanHook || !attachments || attachments.length === 0) {
    return [];
  }

  const scanErrors = [];

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    try {
      const result = await _virusScanHook(att);
      if (result && result.infected) {
        scanErrors.push(
          new AttachmentValidationError(
            `Attachment "${att.filename || "unnamed"}" failed virus scan: ${result.message || "Infected"}`,
            { filename: att.filename, contentType: att.contentType }
          )
        );
      }
    } catch (scanErr) {
      logger.error("[email:attachments] Virus scan error", {
        filename: att.filename,
        error: scanErr.message,
      });
      scanErrors.push(
        new AttachmentValidationError(
          `Virus scan failed for "${att.filename || "unnamed"}": ${scanErr.message}`,
          { filename: att.filename }
        )
      );
    }
  }

  return scanErrors;
}

const MIME_MAP = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".csv": "text/csv",
};

function _inferContentType(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return MIME_MAP[ext] || "application/octet-stream";
}

module.exports = {
  validateAttachments,
  validateAttachmentsWithVirusScan,
  setVirusScanHook,
  clearVirusScanHook,
  getVirusScanHook,
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_SIZE_BYTES,
};
