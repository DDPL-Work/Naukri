function normalizeSalary(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;

  const str = String(value).replace(/[₹,\s]/g, "").toLowerCase();

  const lpaMatch = str.match(/^(\d+(?:\.\d+)?)\s*lpa$/);
  if (lpaMatch) return parseFloat(lpaMatch[1]) * 100000;

  const thousandMatch = str.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (thousandMatch) return parseFloat(thousandMatch[1]) * 1000;

  const lakhMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:lacs?|lakh?|l)$/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  const pmMatch = str.match(/^(\d+(?:\.\d+)?)\s*k\s*pm$/);
  if (pmMatch) return parseFloat(pmMatch[1]) * 1000 * 12;

  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(lpa|k|lac?s?)?/);
  if (rangeMatch) {
    const multiplier = rangeMatch[3] === "k" ? 1000 : 100000;
    const mid = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    return mid * multiplier;
  }

  const numeric = parseFloat(str);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isSalaryInRange(candidateSalary, jobMin, jobMax, tolerance = 0.2) {
  const c = normalizeSalary(candidateSalary);
  const min = jobMin || 0;
  const max = jobMax || Number.POSITIVE_INFINITY;

  if (c >= min && c <= max) return 10;
  const lowBound = min * (1 - tolerance);
  const highBound = max * (1 + tolerance);
  if (c >= lowBound && c <= highBound) return 5;
  return 0;
}

module.exports = { normalizeSalary, isSalaryInRange };
