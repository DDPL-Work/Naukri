const logger = require("../../config/logger");

const REQUIRED_FIELDS = ["currentTitle", "skills", "preferredLocations"];

function validateCandidateProfile(profile) {
  if (!profile) {
    return { valid: false, reason: "no_profile" };
  }

  const missing = [];
  for (const field of REQUIRED_FIELDS) {
    const value = profile[field];
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === "string" && value.trim() === "")) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return { valid: false, reason: `missing_fields:${missing.join(",")}` };
  }

  return { valid: true };
}

module.exports = { validateCandidateProfile, REQUIRED_FIELDS };
