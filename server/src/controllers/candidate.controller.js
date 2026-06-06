const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const asyncHandler = require("../middleware/async.middleware");
const User = require("../models/User");
const Job = require("../models/Job");
const Company = require("../models/Company");
const CompanyReview = require("../models/CompanyReview");
const QRCode = require("../models/QRCode");
const Application = require("../models/Application");
const CandidateProfile = require("../models/CandidateProfile");
const CandidateProfileHistory = require("../models/CandidateProfileHistory");
const CandidateNotification = require("../models/CandidateNotification");
const CandidateQuizResult = require("../models/CandidateQuizResult");
const { uploadResumeFile } = require("../services/resume-storage.service");
const { replaceCandidateImage } = require("../services/candidate-image-storage.service");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const supportedResumeMimeTypes = new Set([
  "application/pdf"
]);

const isPdfResumeUpload = (file = null) => {
  if (!file) {
    return false;
  }

  const mimeType = String(file.mimetype || "").toLowerCase();
  const fileName = String(file.originalname || "").toLowerCase();
  return supportedResumeMimeTypes.has(mimeType) || fileName.endsWith(".pdf");
};

const generateToken = (id) =>
  jwt.sign({ id, type: "CANDIDATE_PANEL" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const formatCompanyReview = (review) => ({
  id: String(review._id),
  candidateName: review.isAnonymous ? "Anonymous Candidate" : (review.candidateName || "Candidate"),
  candidateTitle: review.candidateTitle || "Verified candidate",
  candidateCity: review.candidateCity || "",
  rating: Number(review.rating || 0),
  headline: review.headline || "",
  review: review.review || "",
  isAnonymous: Boolean(review.isAnonymous),
  createdAt: review.createdAt || null,
  lastUpdated: review.updatedAt || review.createdAt || null,
});

const generateTemporaryPassword = () =>
  `Mvn!${crypto.randomBytes(8).toString("hex")}`;

const DASHBOARD_PIPELINE_LIMIT = 24;
const DASHBOARD_ALERTS_LIMIT = 1;
const DAILY_QUIZ_XP_PER_CORRECT = 10;

const DAILY_QUIZ_BANK = [
  {
    id: "react-effect",
    topic: "React",
    q: "Which hook should you use to run a side effect after render?",
    options: ["useMemo", "useEffect", "useCallback", "useRef"],
    correct: 1,
  },
  {
    id: "node-event-loop",
    topic: "Node.js",
    q: "What does the event loop in Node.js primarily handle?",
    options: ["Compiling JavaScript", "Managing async I/O callbacks", "Allocating memory", "Bundling modules"],
    correct: 1,
  },
  {
    id: "mongo-in",
    topic: "MongoDB",
    q: "Which MongoDB operator finds documents where a field value is in a list?",
    options: ["$exists", "$in", "$all", "$elemMatch"],
    correct: 1,
  },
  {
    id: "js-null-type",
    topic: "JavaScript",
    q: "What is the output of typeof null?",
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
    correct: 2,
  },
  {
    id: "css-z-index",
    topic: "CSS",
    q: "Which CSS property controls the stacking order of elements?",
    options: ["position", "z-index", "display", "overflow"],
    correct: 1,
  },
];

const getDailyQuizKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getDailyQuiz = () => ({
  key: getDailyQuizKey(),
  title: "Full Stack Fundamentals",
  subtitle: "Test your knowledge across React, Node.js, MongoDB, JavaScript, and CSS.",
  durationSeconds: DAILY_QUIZ_BANK.length * 12,
  xpPerCorrect: DAILY_QUIZ_XP_PER_CORRECT,
  maxXp: DAILY_QUIZ_BANK.length * DAILY_QUIZ_XP_PER_CORRECT,
  questions: DAILY_QUIZ_BANK.map(({ correct, ...question }) => question),
});

const calculateCandidateXp = async (candidateId) => {
  const rows = await CandidateQuizResult.aggregate([
    { $match: { candidateId } },
    {
      $group: {
        _id: "$candidateId",
        totalXp: { $sum: "$xpEarned" },
        quizzesPlayed: { $sum: 1 },
        bestScore: { $max: "$score" },
      },
    },
  ]);

  return rows[0] || { totalXp: 0, quizzesPlayed: 0, bestScore: 0 };
};

const normalizeIndianPhoneNumber = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return "";
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "Unavailable";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const computeProfileCompletion = (profile, user) => {
  const checkpoints = [
    user?.name,
    user?.email,
    profile.phone,
    profile.headline,
    profile.summary,
    profile.totalExperience,
    profile.currentCity,
    profile.skills?.length > 0,
    profile.preferredRoles?.length > 0,
    profile.preferredLocations?.length > 0,
    profile.expectedSalary,
    profile.education,
    profile.itSkills,
    profile.projectTitle,
    profile.resume?.url,
    profile.profilePic?.url,
    profile.coverPic?.url,
  ];

  const filledCount = checkpoints.filter((item) => {
    if (typeof item === 'boolean') return item;
    return Boolean(item);
  }).length;

  return Math.round((filledCount / checkpoints.length) * 100);
};

const formatCandidateUser = (user = null) => ({
  id: String(user?._id || ""),
  name: user?.name || "",
  email: user?.email || "",
  role: user?.role || "CANDIDATE",
  designation: user?.department || "",
  accessStatus: user?.accessStatus || "ACTIVE",
});

const formatProfile = (profile = {}, user = null) => ({
  id: String(profile?._id || ""),
  user: formatCandidateUser(user),
  phone: profile?.phone || "",
  altPhone: profile?.altPhone || "",
  headline: profile?.headline || "",
  summary: profile?.summary || "",
  totalExperience: profile?.totalExperience || "",
  currentTitle: profile?.currentTitle || user?.department || "",
  currentCompany: profile?.currentCompany || "",
  noticePeriod: profile?.noticePeriod || "",
  currentCity: profile?.currentCity || "",
  currentState: profile?.currentState || "",
  currentCountry: profile?.currentCountry || "",
  preferredLocations: profile?.preferredLocations || [],
  preferredRoles: profile?.preferredRoles || [],
  skills: profile?.skills || [],
  linkedInUrl: profile?.linkedInUrl || "",
  portfolioUrl: profile?.portfolioUrl || "",
  expectedSalary: profile?.expectedSalary || "",
  education: profile?.education || "",
  itSkills: profile?.itSkills || "",
  projectTitle: profile?.projectTitle || "",
  projectLink: profile?.projectLink || "",
  projectDescription: profile?.projectDescription || "",
  lastScannedQrToken: profile?.lastScannedQrToken || "",
  savedJobIds: (profile?.savedJobIds || []).map((id) => String(id)),
  followedCompanyIds: (profile?.followedCompanyIds || []).map((id) => String(id)),
  resume: {
    fileName: profile?.resume?.fileName || "",
    url: profile?.resume?.url || "",
    storageProvider: profile?.resume?.storageProvider || "",
    sizeBytes: Number(profile?.resume?.sizeBytes || 0),
    mimeType: profile?.resume?.mimeType || "",
    uploadedAt: profile?.resume?.uploadedAt || null,
  },
  profileCompletion: computeProfileCompletion(profile || {}, user || {}),
  profilePic: profile?.profilePic || { url: "", publicId: "" },
  coverPic: profile?.coverPic || { url: "", publicId: "" },
  updatedAt: profile?.updatedAt,
  lastUpdated: formatRelativeTime(profile?.updatedAt),
});

const parseExperienceRange = (expStr) => {
  if (!expStr) return { min: 0, max: 99 };
  const cleaned = String(expStr).toLowerCase().replace(/yrs?|years?/gi, "").trim();
  const parts = cleaned.split(/[-–]/)
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n));
  if (parts.length >= 2) return { min: parts[0], max: parts[1] };
  if (parts.length === 1) return { min: 0, max: parts[0] };
  return { min: 0, max: 99 };
};

const normalizeStr = (s) => String(s || "").toLowerCase().trim();

const normalizeSearchTerms = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean);

const jobMatchesKeywordSearch = (job, search = "") => {
  const terms = normalizeSearchTerms(search);
  if (!terms.length) return true;

  const skills = (Array.isArray(job.skills) ? job.skills : []).map((skill) => String(skill || "").toLowerCase());
  const stackAliases = [];
  const hasSkillAny = (aliases) => aliases.some((alias) =>
    skills.some((candidateSkill) => candidateSkill.includes(alias)),
  );

  if (
    hasSkillAny(["mongodb", "mongo"]) &&
    hasSkillAny(["express", "express.js"]) &&
    hasSkillAny(["react", "react.js"]) &&
    hasSkillAny(["node", "node.js"])
  ) {
    stackAliases.push("mern", "mern stack");
  }

  if (
    hasSkillAny(["mongodb", "mongo"]) &&
    hasSkillAny(["express", "express.js"]) &&
    hasSkillAny(["angular"]) &&
    hasSkillAny(["node", "node.js"])
  ) {
    stackAliases.push("mean", "mean stack");
  }

  const searchableText = [
    job.title,
    job.department,
    job.location,
    job.experience,
    job.companyId?.name,
    job.companyId?.industry,
    ...(Array.isArray(job.skills) ? job.skills : []),
    ...stackAliases,
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => searchableText.includes(term));
};

const computeMatchScore = (job, profile) => {
  if (!job || !profile) {
    return { overall: 0, skillMatch: 0, locationMatch: 0, experienceMatch: 0, roleMatch: 0, matchedSkills: [], missingSkills: [] };
  }

  const jobSkills = (Array.isArray(job.skills) ? job.skills : []).map(normalizeStr).filter(Boolean);
  const profileSkills = (Array.isArray(profile.skills) ? profile.skills : []).map(normalizeStr).filter(Boolean);

  const matchedSkills = [];
  const missingSkills = [];
  jobSkills.forEach((js) => {
    const found = profileSkills.some((ps) => ps.includes(js) || js.includes(ps));
    if (found) matchedSkills.push(js);
    else missingSkills.push(js);
  });
  const skillMatch = jobSkills.length > 0
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : profileSkills.length > 0 ? 50 : 0;

  const jobLoc = normalizeStr(job.location);
  const candidateCity = normalizeStr(profile.currentCity);
  const prefLocs = (profile.preferredLocations || []).map(normalizeStr);
  let locationMatch = 0;
  if (jobLoc) {
    if (candidateCity && jobLoc.includes(candidateCity)) locationMatch = 100;
    else if (prefLocs.some((pl) => jobLoc.includes(pl) || pl.includes(jobLoc))) locationMatch = 85;
    else if (jobLoc.includes("remote")) locationMatch = 90;
    else locationMatch = 20;
  } else {
    locationMatch = 70;
  }

  const jobExp = parseExperienceRange(job.experience);
  const candidateExp = parseFloat(profile.totalExperience) || 0;
  let experienceMatch = 0;
  if (candidateExp >= jobExp.min && candidateExp <= jobExp.max) {
    experienceMatch = 100;
  } else if (candidateExp < jobExp.min) {
    const gap = jobExp.min - candidateExp;
    experienceMatch = Math.max(0, Math.round(100 - gap * 20));
  } else {
    const gap = candidateExp - jobExp.max;
    experienceMatch = Math.max(0, Math.round(100 - gap * 10));
  }

  const prefRoles = (profile.preferredRoles || []).map(normalizeStr);
  const jobTitle = normalizeStr(job.title);
  const jobDept = normalizeStr(job.department);
  let roleMatch = 0;
  if (prefRoles.length > 0) {
    const titleMatch = prefRoles.some((r) => jobTitle.includes(r) || r.includes(jobTitle));
    const deptMatch = prefRoles.some((r) => jobDept.includes(r) || r.includes(jobDept));
    if (titleMatch) roleMatch = 100;
    else if (deptMatch) roleMatch = 70;
    else roleMatch = 15;
  } else {
    roleMatch = 40;
  }

  const overall = Math.round(
    skillMatch * 0.40 +
    locationMatch * 0.25 +
    experienceMatch * 0.25 +
    roleMatch * 0.10
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    skillMatch: Math.min(100, Math.max(0, skillMatch)),
    locationMatch: Math.min(100, Math.max(0, locationMatch)),
    experienceMatch: Math.min(100, Math.max(0, experienceMatch)),
    roleMatch: Math.min(100, Math.max(0, roleMatch)),
    matchedSkills: matchedSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    missingSkills: missingSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
  };
};

const formatJob = (job, applicationMap = new Map(), matchData = null) => {
  const application = applicationMap.get(String(job._id));

  return {
    id: String(job._id),
    companyId: String(job.companyId?._id || job.companyId || ""),
    companyName: job.companyId?.name || "Unknown company",
    companyLogoUrl: job.companyId?.logoUrl || "",
    title: job.title,
    department: job.department || "General",
    jobType: job.jobType || "",
    workplaceType: job.workplaceType || "",
    location: job.location || "",
    experience: job.experience || "",
    salaryMin: Number(job.salaryMin || 0),
    salaryMax: Number(job.salaryMax || 0),
    summary: job.summary || "",
    description: job.description || "",
    skills: Array.isArray(job.skills) ? job.skills : [],
    deadline: job.deadline || null,
    isActive: Boolean(job.isActive),
    applicationStatus: application?.status || "",
    hasApplied: Boolean(application),
    hasSaved: Boolean(matchData?.savedJobIds?.has?.(String(job._id))),
    createdAt: job.createdAt,
    lastUpdated: formatRelativeTime(job.updatedAt),
    matchScore: matchData?.overall ?? null,
    skillMatch: matchData?.skillMatch ?? null,
    locationMatch: matchData?.locationMatch ?? null,
    experienceMatch: matchData?.experienceMatch ?? null,
    roleMatch: matchData?.roleMatch ?? null,
    matchedSkills: matchData?.matchedSkills || [],
    missingSkills: matchData?.missingSkills || [],
  };
};

const formatApplication = (application, matchData = null) => ({
  id: String(application._id),
  jobId: String(application.jobId?._id || application.jobId || ""),
  jobTitle: application.jobId?.title || "Unknown job",
  companyId: String(application.companyId?._id || application.companyId || ""),
  companyName: application.companyId?.name || "Unknown company",
  status: application.status,
  resumeUrl: application.resumeUrl || "",
  resumeFileName: application.resumeFileName || "",
  sourceQrToken: application.sourceQrToken || "",
  appliedAt: application.createdAt,
  updatedAt: application.updatedAt,
  lastUpdated: formatRelativeTime(application.updatedAt),
  matchScore: matchData?.overall ?? null,
  skillMatch: matchData?.skillMatch ?? null,
  locationMatch: matchData?.locationMatch ?? null,
  experienceMatch: matchData?.experienceMatch ?? null,
  roleMatch: matchData?.roleMatch ?? null,
  matchedSkills: matchData?.matchedSkills || [],
  missingSkills: matchData?.missingSkills || [],
  jobLocation: application.jobId?.location || "",
  jobExperience: application.jobId?.experience || "",
  jobSkills: Array.isArray(application.jobId?.skills) ? application.jobId.skills : [],
});

const formatNotification = (notification) => ({
  id: String(notification._id),
  title: notification.title,
  message: notification.message,
  category: notification.category,
  status: notification.status,
  actionUrl: notification.actionUrl || "",
  createdAt: notification.createdAt,
  lastUpdated: formatRelativeTime(notification.updatedAt),
  metadata: notification.metadata || {},
});

const formatHistoryItem = (entry) => ({
  id: String(entry._id),
  action: entry.action,
  changedFields: entry.changedFields || [],
  changes: entry.changes || [],
  createdAt: entry.createdAt,
  lastUpdated: formatRelativeTime(entry.createdAt),
});

const ensureCandidateProfile = async (user) => {
  let profile = await CandidateProfile.findOne({ userId: user._id });

  if (!profile) {
    profile = await CandidateProfile.create({ userId: user._id });
    await CandidateProfileHistory.create({
      candidateId: user._id,
      profileId: profile._id,
      action: "CREATE",
      changedFields: [],
      changes: [],
      actorType: "SYSTEM",
    });
  }

  if (!String(profile.currentTitle || "").trim() && String(user.department || "").trim()) {
    profile.currentTitle = String(user.department).trim();
    await profile.save();
  }

  return profile;
};

const resolveQrContext = async (
  token,
  { expandToCompanyJobs = false, limit = 24 } = {},
) => {
  const qrCode = await QRCode.findOne({ token, isActive: true }).populate("companyId");

  if (!qrCode || !qrCode.companyId) {
    throw createHttpError(404, "Invalid or expired QR code");
  }

  const mappedJobId = qrCode.jobId ? String(qrCode.jobId) : "";

  const jobs = await Job.find(
    mappedJobId && !expandToCompanyJobs
      ? {
        _id: qrCode.jobId,
        companyId: qrCode.companyId._id,
        isActive: true,
        approvalStatus: "APPROVED",
      }
      : {
        companyId: qrCode.companyId._id,
        isActive: true,
        approvalStatus: "APPROVED",
      },
  )
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("companyId", "name");

  if (mappedJobId && expandToCompanyJobs) {
    jobs.sort((left, right) => {
      const leftMapped = String(left._id) === mappedJobId;
      const rightMapped = String(right._id) === mappedJobId;

      if (leftMapped === rightMapped) {
        return 0;
      }

      return leftMapped ? -1 : 1;
    });
  }

  return {
    qrCode,
    company: qrCode.companyId,
    jobs,
  };
};

const buildApplicationMap = async (candidateId, jobIds) => {
  if (!jobIds.length) {
    return new Map();
  }

  const applications = await Application.find({
    candidateId,
    jobId: { $in: jobIds },
  });

  return new Map(applications.map((application) => [String(application.jobId), application]));
};

const getRecommendedJobs = async (profile, candidateId) => {
  let jobs = [];
  let mappedCompany = null;

  if (profile.lastScannedQrToken) {
    try {
      const context = await resolveQrContext(profile.lastScannedQrToken, {
        expandToCompanyJobs: true,
        limit: 24,
      });
      jobs = context.jobs;
      mappedCompany = context.company;
    } catch {
      jobs = [];
    }
  }

  // Always fetch all active jobs to populate categories
  const allJobs = await Job.find({ isActive: true, approvalStatus: "APPROVED" })
    .sort({ updatedAt: -1 })
    .populate("companyId", "name");

  const applicationMap = await buildApplicationMap(
    candidateId,
    allJobs.map((job) => job._id),
  );

  const formattedJobs = allJobs.map((job) => formatJob(job, applicationMap));

  const categories = {
    Profile: [],
    Applies: [],
    Preferences: [],
    'You might like': []
  };

  const profileSkills = profile.skills || [];
  const preferredRoles = profile.preferredRoles || [];
  const preferredLocations = profile.preferredLocations || [];

  formattedJobs.forEach(job => {
    let categorized = false;

    if (job.hasApplied) {
      categories.Applies.push(job);
      categorized = true;
    }

    // Check Profile (Skills match)
    const hasSkillMatch = job.skills && job.skills.some(skill => profileSkills.includes(skill));
    if (hasSkillMatch && !categories.Profile.includes(job)) {
      categories.Profile.push(job);
      categorized = true;
    }

    // Check Preferences (Role or Location match)
    // We don't have location on the formatted job easily accessible without populated fields, but we can check title vs preferredRoles
    const hasRoleMatch = preferredRoles.some(role => job.title?.toLowerCase().includes(role.toLowerCase()));
    if (hasRoleMatch && !categories.Preferences.includes(job)) {
      categories.Preferences.push(job);
      categorized = true;
    }

    if (!categorized) {
      categories['You might like'].push(job);
    }
  });

  const categorizedJobs = {
    [`Profile (${categories.Profile.length})`]: categories.Profile,
    [`Applies (${categories.Applies.length})`]: categories.Applies,
    [`Preferences (${categories.Preferences.length})`]: categories.Preferences,
    [`You might like (${categories['You might like'].length})`]: categories['You might like']
  };

  return {
    mappedCompany: mappedCompany
      ? {
        id: String(mappedCompany._id),
        name: mappedCompany.name,
        industry: mappedCompany.industry || "General",
        city: mappedCompany.location?.city || "",
        region: mappedCompany.location?.region || "",
      }
      : null,
    jobs: categorizedJobs,
  };
};

const buildSimilarJobs = async (job, candidateId) => {
  const similarJobs = await Job.find({
    _id: { $ne: job._id },
    isActive: true,
    approvalStatus: "APPROVED",
    $or: [
      { companyId: job.companyId?._id || job.companyId },
      job.department ? { department: job.department } : null,
      Array.isArray(job.skills) && job.skills.length ? { skills: { $in: job.skills } } : null,
    ].filter(Boolean),
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate("companyId", "name");

  const applicationMap = await buildApplicationMap(
    candidateId,
    similarJobs.map((item) => item._id),
  );

  return similarJobs.map((item) => formatJob(item, applicationMap));
};

const escapeCsvValue = (value) => {
  const normalized =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join(" | ")
        : String(value);

  return `"${normalized.replace(/"/g, '""')}"`;
};

const sendCsv = (res, fileName, headers, rows) => {
  const csv = [headers, ...rows]
    .map((line) => line.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
  res.status(200).send(csv);
};

exports.register = asyncHandler(async (req, res) => {
  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const name = String(requestBody.name || "").trim();
  const designation = String(requestBody.designation || "").trim();
  const phone = String(requestBody.phone || "").trim();
  const email = String(requestBody.email || "").trim();
  const password = String(requestBody.password || "").trim();
  const qrToken = String(requestBody.qrToken || "").trim();
  const preferredLocation = String(requestBody.preferredLocation || "").trim();
  const expectedSalary = String(requestBody.expectedSalary || "").trim();

  if (!Object.keys(requestBody).length) {
    throw createHttpError(
      400,
      "Invalid registration payload. Send multipart/form-data with candidate fields and resume file.",
    );
  }

  if (!name || !designation || !phone || !email) {
    throw createHttpError(
      400,
      "Name, preferred position, phone number, and email are required.",
    );
  }

  const normalizedPhone = normalizeIndianPhoneNumber(phone);
  if (!normalizedPhone) {
    throw createHttpError(400, "Phone number must contain exactly 10 digits.");
  }

  if (req.file && !isPdfResumeUpload(req.file)) {
    throw createHttpError(400, "Only PDF resume files are supported.");
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createHttpError(409, "Email already exists");
  }

  const resolvedPassword = String(password || "").trim() || generateTemporaryPassword();

  let user = null;

  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(resolvedPassword, 10),
      role: "CANDIDATE",
      department: designation.trim(),
      accessStatus: "ACTIVE",
      isActive: true,
    });

    let uploadedResume = null;
    if (req.file) {
      uploadedResume = await uploadResumeFile(req.file, user._id);
    }

    const profileData = {
      userId: user._id,
      phone: normalizedPhone,
      currentTitle: designation.trim(),
      lastScannedQrToken: qrToken.trim(),
      preferredLocations: preferredLocation ? [preferredLocation] : [],
      expectedSalary: expectedSalary || "",
    };

    if (uploadedResume) {
      profileData.resume = {
        ...uploadedResume,
        uploadedAt: new Date(),
      };
    }

    const profile = await CandidateProfile.create(profileData);

    const changedFields = [];
    const changes = [];

    if (designation.trim()) {
      changedFields.push("currentTitle");
      changes.push({
        field: "currentTitle",
        previousValue: "",
        nextValue: designation.trim(),
      });
    }

    if (phone.trim()) {
      changedFields.push("phone");
      changes.push({
        field: "phone",
        previousValue: "",
        nextValue: normalizedPhone,
      });
    }

    if (qrToken.trim()) {
      changedFields.push("lastScannedQrToken");
      changes.push({
        field: "lastScannedQrToken",
        previousValue: "",
        nextValue: qrToken.trim(),
      });
    }

    if (preferredLocation) {
      changedFields.push("preferredLocations");
      changes.push({
        field: "preferredLocations",
        previousValue: [],
        nextValue: [preferredLocation],
      });
    }

    if (expectedSalary) {
      changedFields.push("expectedSalary");
      changes.push({
        field: "expectedSalary",
        previousValue: "",
        nextValue: expectedSalary,
      });
    }

    if (uploadedResume) {
      changedFields.push("resume");
      changes.push({
        field: "resume",
        previousValue: { fileName: "", url: "" },
        nextValue: {
          fileName: uploadedResume.fileName,
          url: uploadedResume.url,
          storageProvider: uploadedResume.storageProvider,
        },
      });
    }

    await CandidateProfileHistory.create({
      candidateId: user._id,
      profileId: profile._id,
      action: "CREATE",
      changedFields,
      changes,
      actorType: "CANDIDATE",
      actorId: user._id,
    });

    const tokenPair = await issueTokenPair({
      user,
      source: "USER",
      req,
    });

    setRefreshCookie(res, tokenPair.refreshToken);

    res.status(201).json({
      success: true,
      referenceId: `MVN-${String(user._id).slice(-8).toUpperCase()}`,
      token: tokenPair.accessToken,
      accessToken: tokenPair.accessToken,
      expiresInSeconds: tokenPair.expiresInSeconds,
      user: formatCandidateUser(user),
      profile: formatProfile(profile, user),
    });
  } catch (error) {
    if (user?._id) {
      await CandidateProfile.deleteOne({ userId: user._id }).catch(() => null);
      await CandidateProfileHistory.deleteMany({ candidateId: user._id }).catch(() => null);
      await User.deleteOne({ _id: user._id }).catch(() => null);
    }
    throw error;
  }
});

exports.login = asyncHandler(async (req, res) => {
  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const email = String(requestBody.email || "").trim();
  const password = String(requestBody.password || "").trim();

  if (!email || !password) {
    throw createHttpError(400, "Email and password are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    role: "CANDIDATE",
  });

  if (!user) {
    throw createHttpError(404, "Candidate account not found");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Candidate account is inactive");
  }

  const profile = await ensureCandidateProfile(user);

  const tokenPair = await issueTokenPair({
    user,
    source: "USER",
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(200).json({
    success: true,
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: formatCandidateUser(user),
    profile: formatProfile(profile, user),
  });
});

exports.me = asyncHandler(async (req, res) => {
  const profile = await ensureCandidateProfile(req.user);

  res.status(200).json({
    success: true,
    user: formatCandidateUser(req.user),
    profile: formatProfile(profile, req.user),
  });
});

exports.getLanding = asyncHandler(async (req, res) => {
  const { qrCode, company, jobs } = await resolveQrContext(req.params.token);

  qrCode.scans += 1;
  await qrCode.save();

  res.status(200).json({
    success: true,
    data: {
      token: qrCode.token,
      company: {
        id: String(company._id),
        name: company.name,
        tagline: company.tagline || "",
        industry: company.industry || "",
        companySize: company.companySize || "",
        foundedYear: company.foundedYear || "",
        employeesCount: company.employeesCount || "",
        headquarters: company.headquarters || "",
        website: company.website || "",
        linkedIn: company.linkedIn || "",
        activelyHiring: Boolean(company.activelyHiring),
        openRoles: Number(company.openRoles || company.activeJobCount || 0),
        about: company.about || "",
        mission: company.mission || "",
        vision: company.vision || "",
        whyJoinUs: company.whyJoinUs || [],
        location: company.location || {},
      },
      jobs: jobs.map((job) => formatJob(job)),
      scans: qrCode.scans,
    },
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const profile = await ensureCandidateProfile(req.user);
  const quizKey = getDailyQuizKey();
  const [applications, notifications, recommended, applicationStats, companyIds, extraJobs, todayQuizResult, quizXp] = await Promise.all([
    Application.find({ candidateId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(DASHBOARD_PIPELINE_LIMIT)
      .populate("companyId", "name")
      .populate("jobId", "title location experience skills department"),
    CandidateNotification.find({ candidateId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(DASHBOARD_ALERTS_LIMIT),
    getRecommendedJobs(profile, req.user._id),
    Application.find({ candidateId: req.user._id }).select("status"),
    Application.distinct("companyId", { candidateId: req.user._id }),
    Job.find({ isActive: true, approvalStatus: "APPROVED" })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("companyId", "name"),
    CandidateQuizResult.findOne({ candidateId: req.user._id, quizKey }),
    calculateCandidateXp(req.user._id),
  ]);

  const unreadAlerts = await CandidateNotification.countDocuments({
    candidateId: req.user._id,
    status: "UNREAD",
  });

  const enrichedApplications = applications.map((item) => {
    const matchData = item.jobId && typeof item.jobId === "object"
      ? computeMatchScore(item.jobId, profile)
      : null;
    return formatApplication(item, matchData);
  });

  const enrichedExtraJobs = extraJobs.map((job) => {
    const matchData = computeMatchScore(job, profile);
    return formatJob(job, new Map(), matchData);
  });

  res.status(200).json({
    success: true,
    data: {
      profile: formatProfile(profile, req.user),
      summary: {
        totalApplications: applicationStats.length,
        shortlisted: applicationStats.filter((item) =>
          ["SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED"].includes(item.status),
        ).length,
        interviews: applicationStats.filter((item) =>
          ["INTERVIEW", "OFFERED", "HIRED"].includes(item.status),
        ).length,
        companiesApplied: companyIds.filter(Boolean).length,
        unreadAlerts,
        quizXp: Number(quizXp.totalXp || 0),
      },
      quiz: {
        isAvailable: !todayQuizResult,
        hasPlayedToday: Boolean(todayQuizResult),
        title: "Your Daily Quiz is Ready!",
        subtitle: todayQuizResult
          ? "You have completed today's challenge. Come back tomorrow for more XP."
          : "Sharpen your skills with today's challenge and earn XP.",
        xpReward: DAILY_QUIZ_BANK.length * DAILY_QUIZ_XP_PER_CORRECT,
        questionCount: DAILY_QUIZ_BANK.length,
        durationSeconds: DAILY_QUIZ_BANK.length * 12,
        totalXp: Number(quizXp.totalXp || 0),
        quizzesPlayed: Number(quizXp.quizzesPlayed || 0),
      },
      mappedCompany: recommended.mappedCompany,
      recommendedJobs: recommended.jobs,
      nvites: enrichedExtraJobs.slice(0, 3),
      earlyAccess: enrichedExtraJobs.slice(3, 10),
      recentApplications: enrichedApplications,
      notifications: notifications.map((item) => formatNotification(item)),
    },
  });
});

exports.getJobs = asyncHandler(async (req, res) => {
  const profile = await ensureCandidateProfile(req.user);
  const token = String(req.query.token || "").trim();
  const search = String(req.query.search || "").trim().toLowerCase();

  let jobs = [];
  let company = null;

  if (token) {
    const qrContext = await resolveQrContext(token, {
      expandToCompanyJobs: true,
      limit: 48,
    });

    jobs = qrContext.jobs;
    company = qrContext.company;

    if (profile.lastScannedQrToken !== token) {
      profile.lastScannedQrToken = token;
      await profile.save();
    }

    if (search) {
      jobs = jobs.filter((job) =>
        [
          job.title,
          job.department,
          job.location,
          job.experience,
          job.companyId?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }
  } else {
    jobs = await Job.find({
      isActive: true,
      approvalStatus: "APPROVED",
    })
      .sort({ updatedAt: -1 })
      .limit(300)
      .populate("companyId", "name industry");

    if (search) {
      jobs = jobs.filter((job) => jobMatchesKeywordSearch(job, search));
    }

    jobs = jobs.slice(0, 48);
  }

  const applicationMap = await buildApplicationMap(
    req.user._id,
    jobs.map((job) => job._id),
  );
  const savedJobIds = new Set((profile.savedJobIds || []).map((id) => String(id)));

  res.status(200).json({
    success: true,
    data: {
      company: company
        ? {
          id: String(company._id),
          name: company.name,
          industry: company.industry || "",
          city: company.location?.city || "",
          region: company.location?.region || "",
        }
        : null,
      jobs: jobs.map((job) => formatJob(job, applicationMap, { savedJobIds })),
    },
  });
});

exports.getJobDetail = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate("companyId", "name industry location");

  if (!job || !job.isActive || job.approvalStatus !== "APPROVED") {
    throw createHttpError(404, "Job not found");
  }

  const profile = await ensureCandidateProfile(req.user);
  const applicationMap = await buildApplicationMap(req.user._id, [job._id]);
  const matchData = {
    ...computeMatchScore(job, profile),
    savedJobIds: new Set((profile.savedJobIds || []).map((savedJobId) => String(savedJobId))),
  };
  const followedCompanyIds = new Set((profile.followedCompanyIds || []).map((companyId) => String(companyId)));

  res.status(200).json({
    success: true,
    data: {
      job: formatJob(job, applicationMap, matchData),
      hasFollowedCompany: followedCompanyIds.has(String(job.companyId?._id || job.companyId || "")),
      similarJobs: await buildSimilarJobs(job, req.user._id),
    },
  });
});

exports.getSimilarJobs = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate("companyId", "name");

  if (!job || !job.isActive || job.approvalStatus !== "APPROVED") {
    throw createHttpError(404, "Job not found");
  }

  res.status(200).json({
    success: true,
    data: await buildSimilarJobs(job, req.user._id),
  });
});

exports.createApplication = asyncHandler(async (req, res) => {
  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const { jobId = "", qrToken = "", sourceJobId = "" } = requestBody;

  if (!jobId) {
    throw createHttpError(400, "Job is required");
  }

  const profile = await ensureCandidateProfile(req.user);

  const job = await Job.findById(jobId).populate("companyId", "name");

  if (!job || !job.isActive || job.approvalStatus !== "APPROVED") {
    throw createHttpError(404, "Job is not available for applications");
  }

  const existingApplication = await Application.findOne({
    candidateId: req.user._id,
    jobId: job._id,
  });

  if (existingApplication) {
    throw createHttpError(409, "You have already applied for this job");
  }

  const application = await Application.create({
    candidateId: req.user._id,
    companyId: job.companyId?._id || job.companyId,
    jobId: job._id,
    status: "APPLIED",
    resumeUrl: profile.resume?.url || "",
    resumeFileName: profile.resume?.fileName || "",
    sourceQrToken: qrToken.trim(),
    sourceJobId: sourceJobId || null,
  });

  if (qrToken.trim()) {
    profile.lastScannedQrToken = qrToken.trim();
    await profile.save();
  }

  await CandidateNotification.create({
    candidateId: req.user._id,
    companyId: job.companyId?._id || job.companyId,
    jobId: job._id,
    applicationId: application._id,
    title: "Application submitted",
    message: `Your application for ${job.title} at ${job.companyId?.name || "the company"
      } has been submitted successfully.`,
    category: "APPLICATION",
    actionUrl: "/candidate/applications",
  });

  const hydratedApplication = await Application.findById(application._id)
    .populate("companyId", "name")
    .populate("jobId", "title");

  res.status(201).json({
    success: true,
    data: formatApplication(hydratedApplication),
  });
});

exports.toggleSavedJob = asyncHandler(async (req, res) => {
  const jobId = String(req.params.id || "").trim();
  const save = req.body?.save !== false;

  const job = await Job.findById(jobId).select("_id isActive approvalStatus");
  if (!job || !job.isActive || job.approvalStatus !== "APPROVED") {
    throw createHttpError(404, "Job not found");
  }

  const profile = await ensureCandidateProfile(req.user);
  const savedIds = new Set((profile.savedJobIds || []).map((id) => String(id)));

  if (save) {
    savedIds.add(String(job._id));
  } else {
    savedIds.delete(String(job._id));
  }

  profile.savedJobIds = [...savedIds];
  await profile.save();

  res.status(200).json({
    success: true,
    data: {
      jobId: String(job._id),
      hasSaved: savedIds.has(String(job._id)),
      savedJobIds: [...savedIds],
    },
  });
});

exports.toggleCompanyFollow = asyncHandler(async (req, res) => {
  const companyId = String(req.params.id || "").trim();
  const follow = req.body?.follow !== false;

  const company = await Company.findById(companyId).select("_id status name");
  if (!company || company.status !== "ACTIVE") {
    throw createHttpError(404, "Company not found");
  }

  const profile = await ensureCandidateProfile(req.user);
  const followedIds = new Set((profile.followedCompanyIds || []).map((id) => String(id)));

  if (follow) {
    if (!followedIds.has(String(company._id))) {
      followedIds.add(String(company._id));
      await CandidateNotification.create({
        candidateId: req.user._id,
        companyId: company._id,
        title: `Following ${company.name || "Company"}`,
        message: `You are now following ${company.name || "this company"}. You will receive updates about their new jobs.`,
        category: "SYSTEM",
        actionUrl: `/company/${company._id}`,
      });
    }
  } else {
    followedIds.delete(String(company._id));
  }

  profile.followedCompanyIds = [...followedIds];
  await profile.save();

  res.status(200).json({
    success: true,
    data: {
      companyId: String(company._id),
      isFollowing: followedIds.has(String(company._id)),
      followedCompanyIds: [...followedIds],
    },
  });
});

exports.getApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ candidateId: req.user._id })
    .sort({ updatedAt: -1 })
    .populate("companyId", "name")
    .populate("jobId", "title");

  res.status(200).json({
    success: true,
    data: applications.map((item) => formatApplication(item)),
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await ensureCandidateProfile(req.user);
  const history = await CandidateProfileHistory.find({ candidateId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(8);

  res.status(200).json({
    success: true,
    data: {
      profile: formatProfile(profile, req.user),
      history: history.map((item) => formatHistoryItem(item)),
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = await ensureCandidateProfile(req.user);
  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const changes = [];

  const syncField = (field, value, transform = (item) => item) => {
    if (value === undefined) {
      return;
    }

    const nextValue = transform(value);
    const previousValue = profile[field];
    const isEqual =
      Array.isArray(previousValue) || Array.isArray(nextValue)
        ? JSON.stringify(previousValue || []) === JSON.stringify(nextValue || [])
        : String(previousValue ?? "") === String(nextValue ?? "");

    if (!isEqual) {
      changes.push({ field, previousValue, nextValue });
      profile[field] = nextValue;
    }
  };

  if (
    requestBody.name !== undefined &&
    String(requestBody.name).trim() &&
    String(requestBody.name).trim() !== req.user.name
  ) {
    changes.push({
      field: "name",
      previousValue: req.user.name,
      nextValue: String(requestBody.name).trim(),
    });
    req.user.name = String(requestBody.name).trim();
    await req.user.save();
  }

  syncField("phone", requestBody.phone, (value) => String(value).trim());
  syncField("altPhone", requestBody.altPhone, (value) => String(value).trim());
  syncField("headline", requestBody.headline, (value) => String(value).trim());
  syncField("summary", requestBody.summary, (value) => String(value).trim());
  syncField("totalExperience", requestBody.totalExperience, (value) => String(value).trim());
  syncField("currentTitle", requestBody.currentTitle, (value) => String(value).trim());
  syncField("currentCompany", requestBody.currentCompany, (value) => String(value).trim());
  syncField("noticePeriod", requestBody.noticePeriod, (value) => String(value).trim());
  syncField("currentCity", requestBody.currentCity, (value) => String(value).trim());
  syncField("currentState", requestBody.currentState, (value) => String(value).trim());
  syncField("currentCountry", requestBody.currentCountry, (value) => String(value).trim());
  syncField("preferredLocations", requestBody.preferredLocations, toArray);
  syncField("preferredRoles", requestBody.preferredRoles, toArray);
  syncField("skills", requestBody.skills, toArray);
  syncField("linkedInUrl", requestBody.linkedInUrl, (value) => String(value).trim());
  syncField("portfolioUrl", requestBody.portfolioUrl, (value) => String(value).trim());
  syncField("expectedSalary", requestBody.expectedSalary, (value) => String(value).trim());
  syncField("education", requestBody.education, (value) => String(value).trim());
  syncField("itSkills", requestBody.itSkills, (value) => String(value).trim());
  syncField("projectTitle", requestBody.projectTitle, (value) => String(value).trim());
  syncField("projectLink", requestBody.projectLink, (value) => String(value).trim());
  syncField("projectDescription", requestBody.projectDescription, (value) => String(value).trim());

  const nextDesignation = String(requestBody.currentTitle || "").trim();
  if (requestBody.currentTitle !== undefined && req.user.department !== nextDesignation) {
    changes.push({
      field: "designation",
      previousValue: req.user.department || "",
      nextValue: nextDesignation,
    });
    req.user.department = nextDesignation;
    await req.user.save();
  }

  if (!changes.length) {
    res.status(200).json({
      success: true,
      data: formatProfile(profile, req.user),
    });
    return;
  }

  await profile.save();
  await CandidateProfileHistory.create({
    candidateId: req.user._id,
    profileId: profile._id,
    action: "UPDATE",
    changedFields: changes.map((item) => item.field),
    changes,
    actorType: "CANDIDATE",
    actorId: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: formatProfile(profile, req.user),
  });
});

exports.getProfileHistory = asyncHandler(async (req, res) => {
  const history = await CandidateProfileHistory.find({ candidateId: req.user._id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    data: history.map((item) => formatHistoryItem(item)),
  });
});

exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, "Resume file is required");
  }

  if (!supportedResumeMimeTypes.has(req.file.mimetype)) {
    throw createHttpError(400, "Only PDF files are supported");
  }

  const profile = await ensureCandidateProfile(req.user);
  const previousResume = {
    fileName: profile.resume?.fileName || "",
    url: profile.resume?.url || "",
  };
  const uploadedResume = await uploadResumeFile(req.file, req.user._id);

  profile.resume = {
    ...uploadedResume,
    uploadedAt: new Date(),
  };
  await profile.save();

  await CandidateProfileHistory.create({
    candidateId: req.user._id,
    profileId: profile._id,
    action: "RESUME_UPLOADED",
    changedFields: ["resume"],
    changes: [
      {
        field: "resume",
        previousValue: previousResume,
        nextValue: {
          fileName: uploadedResume.fileName,
          url: uploadedResume.url,
          storageProvider: uploadedResume.storageProvider,
        },
      },
    ],
    actorType: "CANDIDATE",
    actorId: req.user._id,
  });

  await CandidateNotification.create({
    candidateId: req.user._id,
    title: "Resume updated",
    message: "Your latest resume is securely stored and ready for future applications.",
    category: "SYSTEM",
    actionUrl: "/candidate/profile",
  });

  res.status(200).json({
    success: true,
    data: formatProfile(profile, req.user),
  });
});

exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await CandidateNotification.find({ candidateId: req.user._id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    data: notifications.map((item) => formatNotification(item)),
  });
});

exports.getTodayQuiz = asyncHandler(async (req, res) => {
  const quiz = getDailyQuiz();
  const existing = await CandidateQuizResult.findOne({
    candidateId: req.user._id,
    quizKey: quiz.key,
  });

  res.status(200).json({
    success: true,
    data: {
      ...quiz,
      hasSubmitted: Boolean(existing),
      previousResult: existing
        ? {
          score: existing.score,
          totalQuestions: existing.totalQuestions,
          xpEarned: existing.xpEarned,
          submittedAt: existing.createdAt,
        }
        : null,
    },
  });
});

exports.submitTodayQuiz = asyncHandler(async (req, res) => {
  const quiz = getDailyQuiz();
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

  const existing = await CandidateQuizResult.findOne({
    candidateId: req.user._id,
    quizKey: quiz.key,
  });

  if (existing) {
    throw createHttpError(409, "Today's quiz has already been submitted");
  }

  const answerMap = new Map(
    answers.map((answer) => [String(answer.questionId || ""), Number(answer.selectedIndex)]),
  );

  const evaluatedAnswers = DAILY_QUIZ_BANK.map((question) => {
    const selectedIndex = answerMap.has(question.id) ? answerMap.get(question.id) : -1;
    return {
      questionId: question.id,
      selectedIndex,
      isCorrect: selectedIndex === question.correct,
    };
  });

  const score = evaluatedAnswers.filter((answer) => answer.isCorrect).length;
  const xpEarned = score * DAILY_QUIZ_XP_PER_CORRECT;

  const result = await CandidateQuizResult.create({
    candidateId: req.user._id,
    quizKey: quiz.key,
    score,
    totalQuestions: DAILY_QUIZ_BANK.length,
    xpEarned,
    answers: evaluatedAnswers,
  });

  await CandidateNotification.create({
    candidateId: req.user._id,
    title: `${xpEarned} XP earned`,
    message: `You scored ${score}/${DAILY_QUIZ_BANK.length} in today's quiz.`,
    category: "SYSTEM",
    actionUrl: "/daily-quiz",
    metadata: { type: "QUIZ_RESULT", quizKey: quiz.key, xpEarned },
  });

  res.status(201).json({
    success: true,
    data: {
      score: result.score,
      totalQuestions: result.totalQuestions,
      xpEarned: result.xpEarned,
      answers: result.answers,
      submittedAt: result.createdAt,
    },
  });
});

exports.getQuizRanking = asyncHandler(async (req, res) => {
  const rows = await CandidateQuizResult.aggregate([
    {
      $group: {
        _id: "$candidateId",
        totalXp: { $sum: "$xpEarned" },
        quizzesPlayed: { $sum: 1 },
        bestScore: { $max: "$score" },
        lastPlayedAt: { $max: "$createdAt" },
      },
    },
    { $sort: { totalXp: -1, bestScore: -1, lastPlayedAt: 1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "candidate",
      },
    },
    { $unwind: "$candidate" },
    {
      $lookup: {
        from: "candidateprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
  ]);

  res.status(200).json({
    success: true,
    data: rows.map((row, index) => ({
      rank: index + 1,
      candidateId: String(row._id),
      name: row.candidate?.name || "Candidate",
      headline: row.profile?.headline || row.candidate?.department || "MavenJobs candidate",
      totalXp: Number(row.totalXp || 0),
      quizzesPlayed: Number(row.quizzesPlayed || 0),
      bestScore: Number(row.bestScore || 0),
      lastPlayedAt: row.lastPlayedAt,
    })),
  });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await CandidateNotification.findOne({
    _id: req.params.id,
    candidateId: req.user._id,
  });

  if (!notification) {
    throw createHttpError(404, "Notification not found");
  }

  notification.status = "READ";
  await notification.save();

  res.status(200).json({
    success: true,
    data: formatNotification(notification),
  });
});

exports.exportCandidateProfiles = asyncHandler(async (req, res) => {
  const users = await User.find({ role: "CANDIDATE" }).select("name email createdAt");
  const profiles = await CandidateProfile.find({
    userId: { $in: users.map((user) => user._id) },
  });
  const applications = await Application.find({
    candidateId: { $in: users.map((user) => user._id) },
  });

  const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const applicationCounts = new Map();

  applications.forEach((application) => {
    const candidateId = String(application.candidateId);
    applicationCounts.set(candidateId, (applicationCounts.get(candidateId) || 0) + 1);
  });

  sendCsv(
    res,
    "candidate-profiles.csv",
    [
      "Name",
      "Email",
      "Phone",
      "Experience",
      "Current Title",
      "Current Company",
      "Skills",
      "Preferred Roles",
      "City",
      "State",
      "Resume Available",
      "Applications",
      "Registered At",
    ],
    users.map((user) => {
      const profile = profileMap.get(String(user._id));

      return [
        user.name,
        user.email,
        profile?.phone || "",
        profile?.totalExperience || "",
        profile?.currentTitle || "",
        profile?.currentCompany || "",
        profile?.skills || [],
        profile?.preferredRoles || [],
        profile?.currentCity || "",
        profile?.currentState || "",
        profile?.resume?.url ? "Yes" : "No",
        applicationCounts.get(String(user._id)) || 0,
        user.createdAt,
      ];
    }),
  );
});

exports.exportCandidateResumes = asyncHandler(async (req, res) => {
  const users = await User.find({ role: "CANDIDATE" }).select("name email");
  const profiles = await CandidateProfile.find({
    userId: { $in: users.map((user) => user._id) },
  });

  const userMap = new Map(users.map((user) => [String(user._id), user]));

  sendCsv(
    res,
    "candidate-resumes.csv",
    ["Name", "Email", "Resume File", "Storage Provider", "Resume URL", "Uploaded At"],
    profiles
      .filter((profile) => profile.resume?.url)
      .map((profile) => {
        const user = userMap.get(String(profile.userId));
        return [
          user?.name || "",
          user?.email || "",
          profile.resume?.fileName || "",
          profile.resume?.storageProvider || "",
          profile.resume?.url || "",
          profile.resume?.uploadedAt || "",
        ];
      }),
  );
});

exports.uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, "Please upload an image file.");
  }

  const type = req.body.type === "cover" ? "cover" : "profile";
  const profile = await ensureCandidateProfile(req.user);
  const previousPublicId = type === "cover" ? profile.coverPic?.publicId : profile.profilePic?.publicId;

  const uploaded = await replaceCandidateImage(req.file, {
    userId: req.user._id,
    type,
    previousPublicId,
  });

  if (type === "cover") {
    profile.coverPic = uploaded;
  } else {
    profile.profilePic = uploaded;
  }

  await profile.save();

  res.status(200).json({
    success: true,
    message: `${type === "cover" ? "Cover" : "Profile"} image updated successfully.`,
    data: uploaded,
    profileCompletion: computeProfileCompletion(profile, req.user),
  });
});

// ── Companies Directory ──────────────────────────────────────────────────────

const COMPANY_PALETTE = [
  '#1E5EFF','#7C3AED','#F59E0B','#0DBF7B','#EF4444',
  '#0F2040','#8B5CF6','#0EA5E9','#4F46E5','#1E40AF',
];

const companyColor = (id) => {
  const hex = String(id).replace(/[^a-f0-9]/gi, '').slice(-4) || '0000';
  const idx = parseInt(hex, 16) % COMPANY_PALETTE.length;
  return COMPANY_PALETTE[Math.abs(idx)];
};

exports.getCompanyStats = asyncHandler(async (req, res) => {
  const [mncs, internet, manufacturing, fortune500, product] = await Promise.all([
    Company.countDocuments({ status: "ACTIVE", industry: { $regex: "MNC|Corporate", $options: "i" } }),
    Company.countDocuments({ status: "ACTIVE", industry: { $regex: "Internet|IT|Software", $options: "i" } }),
    Company.countDocuments({ status: "ACTIVE", industry: { $regex: "Manufacturing", $options: "i" } }),
    Company.countDocuments({ status: "ACTIVE", packageType: "ELITE" }),
    Company.countDocuments({ status: "ACTIVE", industry: { $regex: "Product", $options: "i" } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      mncs,
      internet,
      manufacturing,
      fortune500,
      product,
    },
  });
});

exports.getCompanies = asyncHandler(async (req, res) => {
  const { q = "", sort = "popular", page = 1, limit = 20, industry = "" } = req.query;

  const filter = { status: "ACTIVE" };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { industry: { $regex: q, $options: "i" } },
      { tagline: { $regex: q, $options: "i" } },
    ];
  }
  if (industry && industry !== 'All') {
    filter.industry = { $regex: industry, $options: "i" };
  }

  let sortQuery = { activeJobCount: -1, createdAt: -1 };
  if (sort === "name") sortQuery = { name: 1 };
  if (sort === "newest") sortQuery = { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [companies, total] = await Promise.all([
    Company.find(filter).sort(sortQuery).skip(skip).limit(Number(limit)),
    Company.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      companies: companies.map((c) => ({
        id: String(c._id),
        name: c.name,
        tagline: c.tagline || "",
        industry: c.industry || "General",
        location: c.location?.city || c.headquarters || "",
        size: c.companySize || c.employeesCount || "",
        activeJobCount: c.activeJobCount || 0,
        activelyHiring: c.activelyHiring !== false,
        packageType: c.packageType || "STANDARD",
        color: companyColor(c._id),
        logo: (c.name || "M")[0].toUpperCase(),
        logoUrl: c.logoUrl || "",
        founded: c.foundedYear || "",
        createdAt: c.createdAt,
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

exports.getCompanyDetail = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company || company.status !== "ACTIVE") {
    throw createHttpError(404, "Company not found");
  }

  const jobs = await Job.find({
    companyId: company._id,
    isActive: true,
    approvalStatus: "APPROVED",
  }).sort({ createdAt: -1 });
  const reviews = await CompanyReview.find({
    companyId: company._id,
    status: "PUBLISHED",
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .select("candidateName candidateTitle candidateCity rating headline review isAnonymous createdAt updatedAt");

  const applicationMap = await buildApplicationMap(req.user._id, jobs.map((j) => j._id));
  const profile = await ensureCandidateProfile(req.user);
  const followedCompanyIds = new Set((profile.followedCompanyIds || []).map((companyId) => String(companyId)));
  const followersCount = await CandidateProfile.countDocuments({ followedCompanyIds: company._id });

  const formattedJobs = jobs.map((j) => ({
    id: String(j._id),
    title: j.title,
    department: j.department || "General",
    experience: j.experience || "",
    location: j.location || company.location?.city || "",
    salaryMin: j.salaryMin || 0,
    salaryMax: j.salaryMax || 0,
    salary:
      j.salaryMin && j.salaryMax
        ? `${(j.salaryMin / 100000).toFixed(0)}–${(j.salaryMax / 100000).toFixed(0)} Lakhs PA`
        : "Not disclosed",
    skills: Array.isArray(j.skills) ? j.skills : [],
    jobType: j.jobType || "Full-time",
    workplaceType: j.workplaceType || "",
    summary: j.summary || "",
    description: j.description || "",
    postedAt: formatRelativeTime(j.createdAt),
    deadline: j.deadline || null,
    hasApplied: applicationMap.has(String(j._id)),
  }));

  res.status(200).json({
    success: true,
    data: {
      company: {
        id: String(company._id),
        name: company.name,
        fullName: company.tagline || company.name,
        industry: company.industry || "General",
        type: company.packageType || "Private",
        size: company.companySize || company.employeesCount || "",
        founded: company.foundedYear || "",
        website: company.website || "",
        linkedIn: company.linkedIn || "",
        location: company.location?.city || company.headquarters || "",
        locationFull: [company.location?.city, company.location?.region]
          .filter(Boolean)
          .join(", ") || "",
        activelyHiring: company.activelyHiring !== false,
        activeJobCount: formattedJobs.length,
        followersCount,
        isFollowing: followedCompanyIds.has(String(company._id)),
        color: companyColor(company._id),
        logo: (company.name || "M")[0].toUpperCase(),
        logoUrl: company.logoUrl || "",
        coverImageUrl: company.coverImageUrl || "",
        about: company.about || "",
        mission: company.mission || "",
        vision: company.vision || "",
        whyJoinUs: Array.isArray(company.whyJoinUs) ? company.whyJoinUs : [],
      },
      jobs: formattedJobs,
      reviews: reviews.map((review) => formatCompanyReview(review)),
    },
  });
});

exports.submitCompanyReview = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company || company.status !== "ACTIVE") {
    throw createHttpError(404, "Company not found");
  }

  const rating = Number.parseInt(req.body.rating, 10);
  const reviewText = String(req.body.review || "").trim();
  const headline = String(req.body.headline || "").trim();
  const isAnonymous = String(req.body.isAnonymous || "true").toLowerCase() !== "false";

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "Rating must be between 1 and 5");
  }

  if (!reviewText) {
    throw createHttpError(400, "Review text is required");
  }

  const profile = await CandidateProfile.findOne({ userId: req.user._id }).select("currentTitle currentCity");

  const savedReview = await CompanyReview.create({
    companyId: company._id,
    candidateId: req.user._id,
    candidateName: req.user.name || "",
    candidateTitle: profile?.currentTitle || "",
    candidateCity: profile?.currentCity || "",
    rating,
    headline,
    review: reviewText,
    isAnonymous,
    status: "PUBLISHED",
  });

  res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    data: {
      review: formatCompanyReview(savedReview),
    },
  });
});
