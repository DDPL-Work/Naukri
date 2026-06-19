const { isSalaryInRange } = require("../utils/salaryNormalizer");
const { scoreNormalizedSkillMatch, normalizeSkill } = require("../utils/skillNormalizer");

function normalize(str) {
  return String(str || "").toLowerCase().trim();
}

function tokenize(str) {
  return normalize(str).split(/[\s,;._\-/\\()]+/).filter(Boolean);
}

function fuzzyTokenMatch(candidateTokens, jobTokens) {
  let matches = 0;
  for (const ct of candidateTokens) {
    for (const jt of jobTokens) {
      if (ct === jt || jt.startsWith(ct) || ct.startsWith(jt) || jt.includes(ct) || ct.includes(jt)) {
        matches++;
        break;
      }
    }
  }
  return matches;
}

function scoreSkillMatch(candidateSkills, jobSkills) {
  if (!candidateSkills?.length || !jobSkills?.length) return 0;

  const normalizedScore = scoreNormalizedSkillMatch(candidateSkills, jobSkills);
  if (normalizedScore > 0) return normalizedScore;

  const cTokens = candidateSkills.flatMap((s) => tokenize(s));
  const jTokens = jobSkills.flatMap((s) => tokenize(s));
  if (!cTokens.length || !jTokens.length) return 0;

  const matched = fuzzyTokenMatch(cTokens, jTokens);
  const maxPossible = Math.min(cTokens.length, jTokens.length);
  const ratio = maxPossible > 0 ? matched / maxPossible : 0;
  return Math.round(Math.min(ratio, 1) * 50);
}

function scoreRoleMatch(candidateTitles, jobTitle) {
  const titles = [].concat(candidateTitles || []).filter(Boolean);
  if (!titles.length || !jobTitle) return 0;

  const jt = normalize(jobTitle);
  const jtTokens = tokenize(jobTitle);

  for (const title of titles) {
    const nt = normalize(title);
    if (nt === jt) return 20;
    const tTokens = tokenize(title);
    const common = tTokens.filter((t) => jtTokens.includes(t)).length;
    const maxLen = Math.max(tTokens.length, jtTokens.length);
    if (maxLen > 0 && common / maxLen >= 0.5) return 20;
  }
  return 0;
}

const CITY_STATE = {
  "panipat": "haryana", "karnal": "haryana", "ambala": "haryana", "gurugram": "haryana",
  "faridabad": "haryana", "sonipat": "haryana", "rohtak": "haryana", "hisar": "haryana",
  "delhi": "delhi", "new delhi": "delhi",
  "chandigarh": "chandigarh", "mohali": "punjab",
  "mumbai": "maharashtra", "pune": "maharashtra", "nagpur": "maharashtra",
  "thane": "maharashtra", "navi mumbai": "maharashtra",
  "bangalore": "karnataka", "bengaluru": "karnataka", "mysore": "karnataka",
  "hyderabad": "telangana", "secunderabad": "telangana",
  "chennai": "tamil nadu", "coimbatore": "tamil nadu", "madurai": "tamil nadu",
  "kolkata": "west bengal", "howrah": "west bengal",
  "ahmedabad": "gujarat", "surat": "gujarat", "vadodara": "gujarat",
  "jaipur": "rajasthan", "jodhpur": "rajasthan", "udaipur": "rajasthan",
  "lucknow": "uttar pradesh", "kanpur": "uttar pradesh", "agra": "uttar pradesh",
  "varanasi": "uttar pradesh", "noida": "uttar pradesh", "ghaziabad": "uttar pradesh",
  "patna": "bihar", "ranchi": "jharkhand", "bhubaneswar": "odisha",
  "indore": "madhya pradesh", "bhopal": "madhya pradesh",
  "guwahati": "assam", "dehradun": "uttarakhand", "shimla": "himachal pradesh",
  "srinagar": "jammu and kashmir", "jammu": "jammu and kashmir",
};

function resolveState(city) {
  const c = normalize(city);
  if (CITY_STATE[c]) return CITY_STATE[c];
  for (const [cityName, state] of Object.entries(CITY_STATE)) {
    if (c.includes(cityName) || cityName.includes(c)) return state;
  }
  return null;
}

function scoreLocationMatch(preferredLocations, jobLocation) {
  if (!preferredLocations?.length || !jobLocation) return 0;

  const jl = normalize(jobLocation);
  if (jl === "remote" || jl.includes("remote")) return 8;

  for (const loc of preferredLocations) {
    const nl = normalize(loc);
    if (nl === jl || jl.includes(nl) || nl.includes(jl)) return 15;

    const locState = resolveState(nl);
    const jobState = resolveState(jl);
    if (locState && jobState && locState === jobState) return 10;
  }

  return 5;
}

const EDUCATION_LEVELS = [
  { patterns: ["10th", "10th grade", "ssc", "matric"], level: 1 },
  { patterns: ["12th", "12th grade", "hsc", "intermediate"], level: 2 },
  { patterns: ["diploma"], level: 3 },
  { patterns: ["bachelor", "b.tech", "btech", "bca", "b.sc", "b.com", "ba", "b.e", "be"], level: 4 },
  { patterns: ["master", "m.tech", "mtech", "mca", "m.sc", "m.com", "ma", "m.e", "me", "mba"], level: 5 },
  { patterns: ["phd", "ph.d", "doctorate"], level: 6 },
];

function getEducationLevel(edu) {
  if (!edu) return 0;
  const e = normalize(edu);
  for (const entry of EDUCATION_LEVELS) {
    for (const pattern of entry.patterns) {
      if (e.includes(pattern) || pattern.includes(e)) return entry.level;
    }
  }
  return 0;
}

function scoreEducationMatch(candidateEducation, minEducation) {
  if (!candidateEducation || !minEducation) return 5;
  const cLevel = getEducationLevel(candidateEducation);
  const mLevel = getEducationLevel(minEducation);
  if (cLevel > 0 && mLevel > 0 && cLevel >= mLevel) return 5;
  if (normalize(candidateEducation) === normalize(minEducation)) return 5;
  return 0;
}

function scoreJob(candidate, job) {
  let total = 0;

  total += scoreSkillMatch(candidate.skills, job.skills);
  total += scoreRoleMatch([candidate.currentTitle, ...(candidate.preferredRoles || [])], job.title);
  total += scoreLocationMatch(candidate.preferredLocations, job.location);
  total += isSalaryInRange(candidate.expectedSalary, job.salaryMin, job.salaryMax);
  total += scoreEducationMatch(candidate.education, job.minimumEducation);

  const createdAt = job.createdAt ? new Date(job.createdAt) : null;
  const now = new Date();
  if (createdAt && (now - createdAt) < 24 * 60 * 60 * 1000) {
    total += 10;
  }

  return Math.min(total, 100);
}

module.exports = { scoreJob, scoreSkillMatch, scoreRoleMatch, scoreLocationMatch, scoreEducationMatch, normalize, tokenize, fuzzyTokenMatch };
