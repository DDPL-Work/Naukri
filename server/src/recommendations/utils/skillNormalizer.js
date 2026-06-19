const SKILL_CATEGORIES = {
  frontend: ["frontend", "front end", "front-end", "ui", "ux", "react", "angular", "vue", "vuejs", "vue.js", "svelte", "html", "css", "javascript", "typescript", "web dev", "web developer", "web development"],
  backend: ["backend", "back end", "back-end", "node", "nodejs", "node.js", "express", "expressjs", "django", "flask", "spring", "springboot", "go", "golang", "rust", "python", "java", "c#", "csharp", "php", "laravel", "ruby", "rails", "api", "rest", "graphql"],
  fullstack: ["full stack", "fullstack", "full-stack", "mern", "mean", "pern"],
  database: ["database", "db", "sql", "mysql", "postgresql", "postgres", "mongodb", "mongo", "redis", "elasticsearch", "cassandra", "dynamodb", "oracle", "mssql"],
  data: ["data", "data science", "data scientist", "machine learning", "ml", "deep learning", "dl", "ai", "artificial intelligence", "tensorflow", "pytorch", "numpy", "pandas", "scikit-learn", "tableau", "power bi"],
  devops: ["devops", "aws", "azure", "gcp", "cloud", "docker", "kubernetes", "k8s", "jenkins", "ci/cd", "cicd", "terraform", "ansible", "puppet", "chef", "linux"],
  mobile: ["mobile", "android", "ios", "react native", "react-native", "flutter", "kotlin", "swift", "dart", "ionic", "xamarin"],
  testing: ["testing", "qa", "quality assurance", "jest", "mocha", "cypress", "selenium", "junit", "pytest", "unit test", "integration test", "e2e"],
  security: ["security", "cybersecurity", "cyber security", "network security", "penetration testing", "pen testing", "ethical hacking", "ssl", "encryption", "firewall"],
  projectManagement: ["project management", "agile", "scrum", "kanban", "jira", "trello", "product management"],
};

const CATEGORY_MAP = {};
for (const [category, aliases] of Object.entries(SKILL_CATEGORIES)) {
  for (const alias of aliases) {
    CATEGORY_MAP[alias] = category;
  }
}

function normalizeSkill(skill) {
  if (!skill) return "";
  return String(skill).toLowerCase().trim();
}

function getSkillCategory(skill) {
  const normalized = normalizeSkill(skill);
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];

  for (const [category, aliases] of Object.entries(SKILL_CATEGORIES)) {
    for (const alias of aliases) {
      const na = normalizeSkill(alias);
      if (normalized === na) return category;
      if (na.length >= 3 && (normalized.startsWith(na) || na.startsWith(normalized))) return category;
      if (na.length >= 3 && (normalized.includes(na) || na.includes(normalized))) return category;
    }
  }

  return null;
}

function getSkillCategories(skills) {
  if (!skills || !Array.isArray(skills)) return new Set();
  const categories = new Set();
  for (const skill of skills) {
    const cat = getSkillCategory(skill);
    if (cat) categories.add(cat);
  }
  return categories;
}

function scoreNormalizedSkillMatch(candidateSkills, jobSkills) {
  if (!candidateSkills?.length || !jobSkills?.length) return 0;

  const candidateCats = getSkillCategories(candidateSkills);
  const jobCats = getSkillCategories(jobSkills);

  if (candidateCats.size === 0 || jobCats.size === 0) return 0;

  let exactCategoryMatches = 0;
  for (const cc of candidateCats) {
    if (jobCats.has(cc)) exactCategoryMatches++;
  }

  const maxPossible = Math.max(candidateCats.size, jobCats.size);
  const categoryRatio = exactCategoryMatches / maxPossible;

  const cAllTokens = candidateSkills.flatMap((s) => normalizeSkill(s).split(/[\s,;._\-/\\()]+/)).filter(Boolean);
  const jAllTokens = jobSkills.flatMap((s) => normalizeSkill(s).split(/[\s,;._\-/\\()]+/)).filter(Boolean);

  let tokenMatches = 0;
  for (const ct of cAllTokens) {
    for (const jt of jAllTokens) {
      if (ct === jt || jt.startsWith(ct) || ct.startsWith(jt) || jt.includes(ct) || ct.includes(jt)) {
        tokenMatches++;
        break;
      }
    }
  }

  const tokenRatio = cAllTokens.length > 0 ? tokenMatches / cAllTokens.length : 0;

  const combinedScore = Math.round((categoryRatio * 0.6 + tokenRatio * 0.4) * 50);
  return Math.min(combinedScore, 50);
}

module.exports = {
  SKILL_CATEGORIES,
  normalizeSkill,
  getSkillCategory,
  getSkillCategories,
  scoreNormalizedSkillMatch,
};
