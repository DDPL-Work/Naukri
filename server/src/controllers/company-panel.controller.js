const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const asyncHandler = require("../middleware/async.middleware");
const User = require("../models/User");
const Company = require("../models/Company");
const CompanyReview = require("../models/CompanyReview");
const Job = require("../models/Job");
const Application = require("../models/Application");
const CandidateProfile = require("../models/CandidateProfile");
const CandidateNotification = require("../models/CandidateNotification");
const PackageChangeRequest = require("../models/PackageChangeRequest");
const {
  loadPackageCatalog,
  applyCompanyPackageSnapshot,
  normalizePackageName,
  resolveCompanyJobLimit,
} = require("../services/package-limit.service");
const {
  buildPackageChangeEffectiveAt,
  formatPackageChangeRequest,
  applyDueApprovedPackageChangesForCompany,
} = require("../services/package-change-request.service");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const APPLICATION_STATUS_ENUM = [
  "APPLIED",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
  "REJECTED",
];

const APPLICATION_STATUS_SET = new Set(APPLICATION_STATUS_ENUM);
const PACKAGE_TYPES = ["STANDARD", "PREMIUM", "ELITE"];

const normalizeApplicationStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return APPLICATION_STATUS_SET.has(normalized) ? normalized : "";
};

const toPositiveInteger = (value, fallback, min = 1, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
};

const isLikelyPdf = ({ fileName = "", url = "", contentType = "" } = {}) => {
  const normalizedContentType = String(contentType || "").toLowerCase();
  if (normalizedContentType.includes("pdf")) {
    return true;
  }

  const normalizedFileName = String(fileName || "").toLowerCase();
  if (normalizedFileName.endsWith(".pdf")) {
    return true;
  }

  const normalizedUrl = String(url || "").toLowerCase();
  return normalizedUrl.includes(".pdf");
};

const generateUserToken = (id) =>
  jwt.sign({ id, type: "USER" }, process.env.JWT_SECRET, { expiresIn: "7d" });

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

const resolveClientUserAndCompany = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user || user.role !== "CLIENT") {
    throw createHttpError(403, "Client access required");
  }

  if (!user.companyId) {
    throw createHttpError(403, "No company is linked to this account");
  }

  const company = await Company.findById(user.companyId);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }

  return { user, company };
};

const formatCompanyForClient = (company, options = {}) => {
  const resolvedJobLimit = Number(
    options?.jobLimit !== undefined ? options.jobLimit : company.jobLimit || 0,
  );
  const activeJobCount = Number(company.activeJobCount || 0);

  return {
    id: String(company._id),
    name: company.name,
    logoUrl: company.logoUrl || "",
    coverImageUrl: company.coverImageUrl || "",
    industry: company.industry || "",
    status: company.status || "ACTIVE",
    packageType: company.packageType || "STANDARD",
    jobLimit: resolvedJobLimit,
    activeJobCount,
    remainingSlots: Math.max(resolvedJobLimit - activeJobCount, 0),
    email: company.email || "",
    phone: company.phone || "",
    website: company.website || "",
    linkedIn: company.linkedIn || "",
    accountManager: company.accountManager || "",
    configurationNotes: company.configurationNotes || "",
    location: {
      city: company.location?.city || "",
      region: company.location?.region || "",
      zone: company.location?.zone || "",
      address: company.location?.address || "",
      pincode: company.location?.pincode || "",
    },
    updatedAt: company.updatedAt || null,
    lastUpdated: formatRelativeTime(company.updatedAt),
  };
};

const formatCompanyReview = (review) => ({
  id: String(review._id),
  candidateName: review.isAnonymous ? "Anonymous Candidate" : (review.candidateName || "Candidate"),
  candidateTitle: review.isAnonymous ? "Verified employee" : (review.candidateTitle || "Verified employee"),
  candidateCity: review.candidateCity || "",
  rating: Number(review.rating || 0),
  headline: review.headline || "",
  review: review.review || "",
  isAnonymous: Boolean(review.isAnonymous),
  createdAt: review.createdAt || null,
  lastUpdated: formatRelativeTime(review.updatedAt || review.createdAt),
});

const getCandidateIdFromApplication = (application) => {
  if (!application) {
    return "";
  }

  if (application.candidateId?._id) {
    return String(application.candidateId._id);
  }

  if (application.candidateId) {
    return String(application.candidateId);
  }

  return "";
};

const formatApplicationStatusLabel = (status = "") =>
  String(status || "")
    .toLowerCase()
    .split("_")
    .map((segment) => (segment ? `${segment[0].toUpperCase()}${segment.slice(1)}` : ""))
    .join(" ");

const formatCompanyApplication = (application, profileMap = new Map()) => {
  const candidateId = getCandidateIdFromApplication(application);
  const profile = profileMap.get(candidateId);

  return {
    id: String(application._id),
    jobId: application.jobId?._id ? String(application.jobId._id) : String(application.jobId || ""),
    jobTitle: application.jobId?.title || "Unknown job",
    candidateId,
    candidateName: application.candidateId?.name || "Candidate",
    candidateEmail: application.candidateId?.email || "",
    candidatePhone: profile?.phone || "",
    candidateCurrentTitle: profile?.currentTitle || "",
    candidateExperience: profile?.totalExperience || "",
    candidateCity: profile?.currentCity || "",
    candidateState: profile?.currentState || "",
    status: normalizeApplicationStatus(application.status) || "APPLIED",
    statusLabel: formatApplicationStatusLabel(application.status || "APPLIED"),
    resumeUrl: application.resumeUrl || profile?.resume?.url || "",
    resumeFileName: application.resumeFileName || profile?.resume?.fileName || "",
    sourceQrToken: application.sourceQrToken || "",
    sourceJobId: application.sourceJobId?._id ? String(application.sourceJobId._id) : String(application.sourceJobId || ""),
    appliedAt: application.createdAt || null,
    updatedAt: application.updatedAt || null,
    lastUpdated: formatRelativeTime(application.updatedAt || application.createdAt),
  };
};

const formatPackageChangeRequestForCompany = (request, company) =>
  formatPackageChangeRequest(request, {
    companyName: company?.name || "",
    requestedByName: company?.name || "Client",
  });

const syncCompanyPackageContext = async (company) => {
  const { packageCatalog, packageLimitMap } = await loadPackageCatalog();

  const appliedResult = await applyDueApprovedPackageChangesForCompany(company, packageLimitMap);
  const packageSnapshot = applyCompanyPackageSnapshot(company, packageLimitMap);

  if (appliedResult.updated || packageSnapshot.dirty) {
    await company.save();
  }

  return {
    packageCatalog,
    packageLimitMap,
    packageSnapshot,
    appliedPackageChange: appliedResult?.lastAppliedRequest || null,
  };
};

const uploadCompanyMedia = async (file, { ownerId, kind }) =>
  new Promise((resolve, reject) => {
    const safeKind = kind === "cover" ? "cover" : "logo";
    const folder = safeKind === "cover" ? "company_cover_images" : "company_logo_images";
    const publicId = `company_${safeKind}_${String(ownerId || "client")}_${crypto.randomUUID()}`;
    const transformations =
      safeKind === "cover"
        ? [{ width: 1600, height: 420, crop: "fill", quality: "auto", fetch_format: "auto" }]
        : [{ width: 420, height: 420, crop: "fill", gravity: "face", quality: "auto", fetch_format: "auto" }];

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        transformation: transformations,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result?.secure_url || "",
          publicId: result?.public_id || "",
          kind: safeKind,
        });
      },
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });

const destroyCompanyMedia = async (publicId) => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  } catch (error) {
    console.warn("Company media cleanup failed:", error?.message || error);
  }
};

exports.login = asyncHandler(async (req, res) => {
  const email = toTrimmedString(req.body.email).toLowerCase();
  const password = toTrimmedString(req.body.password);

  if (!email || !password) {
    throw createHttpError(400, "Email and password are required");
  }

  const user = await User.findOne({ email, role: "CLIENT" }).select("+password");
  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Client account is inactive");
  }

  const company = user.companyId ? await Company.findById(user.companyId) : null;
  if (!company) {
    throw createHttpError(404, "Company profile not found");
  }

  if (company.status === "INACTIVE") {
    throw createHttpError(403, "Company profile is inactive");
  }

  const { packageSnapshot } = await syncCompanyPackageContext(company);

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
    user: {
      id: String(user._id),
      username: user.name || "",
      email: user.email || "",
      role: user.role || "CLIENT",
      companyId: String(company._id),
      companyName: company.name || "",
    },
    company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
  });
});

exports.register = asyncHandler(async (req, res) => {
  const fullName = toTrimmedString(req.body.fullName || req.body.name);
  const companyName = toTrimmedString(req.body.companyName);
  const email = toTrimmedString(req.body.email).toLowerCase();
  const password = toTrimmedString(req.body.password);
  const phone = toTrimmedString(req.body.phone);
  const hiringFor = toTrimmedString(req.body.hiringFor || "company");
  const designation = toTrimmedString(req.body.designation);
  const city = toTrimmedString(req.body.city);

  if (!fullName || !companyName || !email || !password || !phone) {
    throw createHttpError(400, "Full name, company name, email, phone, and password are required");
  }

  if (!/^\d{10}$/.test(phone)) {
    throw createHttpError(400, "Enter a valid 10 digit mobile number");
  }

  if (password.length < 7 || password.length > 20) {
    throw createHttpError(400, "Password must be between 7 and 20 characters");
  }

  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) {
    throw createHttpError(409, "An account already exists for this email");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let user = null;
  let company = null;

  try {
    user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      role: "CLIENT",
      accessStatus: "ACTIVE",
      isActive: true,
    });

    company = await Company.create({
      name: companyName,
      tagline: designation || (hiringFor === "consultancy" ? "Consultancy hiring partner" : "Employer account"),
      industry: hiringFor === "consultancy" ? "Consultancy" : "Company",
      email,
      phone,
      location: {
        city,
      },
      createdByCRM: user._id,
      clientUserId: user._id,
      packageType: "STANDARD",
      jobLimit: 2,
      status: "ACTIVE",
      configurationNotes: designation ? `Primary contact title: ${designation}` : "",
    });

    user.companyId = company._id;
    await user.save();
  } catch (error) {
    if (company?._id) {
      await Company.deleteOne({ _id: company._id });
    }
    if (user?._id) {
      await User.deleteOne({ _id: user._id });
    }
    throw error;
  }

  const { packageSnapshot } = await syncCompanyPackageContext(company);

  const tokenPair = await issueTokenPair({
    user,
    source: "USER",
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(201).json({
    success: true,
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: {
      id: String(user._id),
      username: user.name || "",
      email: user.email || "",
      role: user.role || "CLIENT",
      companyId: String(company._id),
      companyName: company.name || "",
    },
    company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);
  const { packageCatalog, packageSnapshot, appliedPackageChange } = await syncCompanyPackageContext(company);

  const [jobs, applications, activePackageRequest, recentPackageRequests, reviews, followers] = await Promise.all([
    Job.find({ companyId: company._id }).sort({ updatedAt: -1 }),
    Application.find({ companyId: company._id })
      .sort({ updatedAt: -1 })
      .populate("jobId", "title")
      .populate("candidateId", "name email"),
    PackageChangeRequest.findOne({
      companyId: company._id,
      $or: [{ status: "PENDING" }, { status: "APPROVED", appliedAt: null }],
    })
      .sort({ createdAt: -1 })
      .select(
        "currentPackageType requestedPackageType currentJobLimit requestedJobLimit status isUpgrade reason decisionNote effectiveAt appliedAt reviewedAt createdAt updatedAt",
      ),
    PackageChangeRequest.find({ companyId: company._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        "currentPackageType requestedPackageType currentJobLimit requestedJobLimit status isUpgrade reason decisionNote effectiveAt appliedAt reviewedAt createdAt updatedAt",
      ),
    CompanyReview.find({ companyId: company._id, status: "PUBLISHED" })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("candidateName candidateTitle candidateCity rating headline review isAnonymous createdAt updatedAt"),
    CandidateProfile.find({ followedCompanyIds: company._id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("userId", "name email")
      .select("userId phone currentTitle totalExperience currentCity currentState updatedAt"),
  ]);

  const candidateIds = [
    ...new Set(
      applications
        .map((item) => (item.candidateId?._id ? String(item.candidateId._id) : String(item.candidateId || "")))
        .filter(Boolean),
    ),
  ];

  const candidateProfiles = candidateIds.length
    ? await CandidateProfile.find({ userId: { $in: candidateIds } }).select(
        "userId phone currentTitle totalExperience currentCity currentState resume",
      )
    : [];

  const profileMap = new Map(
    candidateProfiles.map((profile) => [String(profile.userId), profile]),
  );

  const applicationCountByJob = new Map();
  applications.forEach((application) => {
    const jobId = application.jobId?._id ? String(application.jobId._id) : String(application.jobId || "");
    if (!jobId) {
      return;
    }
    applicationCountByJob.set(jobId, Number(applicationCountByJob.get(jobId) || 0) + 1);
  });

  const jobRows = jobs.map((job) => ({
    id: String(job._id),
    title: job.title || "",
    department: job.department || "",
    location: job.location || "",
    experience: job.experience || "",
    approvalStatus: job.approvalStatus || "PENDING",
    rejectionReason: job.rejectionReason || "",
    isActive: Boolean(job.isActive),
    createdBySource: job.createdBySource || "CLIENT",
    requiresPackageOverride: Boolean(job.requiresPackageOverride),
    applicantCount: Number(applicationCountByJob.get(String(job._id)) || 0),
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
    lastUpdated: formatRelativeTime(job.updatedAt),
  }));

  const applicationRows = applications.map((application) => {
    return formatCompanyApplication(application, profileMap);
  });

  const approvedJobs = jobs.filter((job) => job.approvalStatus === "APPROVED");
  const pendingJobs = jobs.filter((job) => job.approvalStatus === "PENDING");
  const rejectedJobs = jobs.filter((job) => job.approvalStatus === "REJECTED");

  const nextActiveJobCount = approvedJobs.filter((job) => job.isActive).length;
  const shouldPersist =
    packageSnapshot.dirty ||
    Number(company.activeJobCount || 0) !== nextActiveJobCount ||
    Number(company.openRoles || 0) !== nextActiveJobCount;

  company.activeJobCount = nextActiveJobCount;
  company.openRoles = company.activeJobCount;
  if (shouldPersist) {
    await company.save();
  }

  res.status(200).json({
    success: true,
    data: {
      company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
      packageCatalog,
      packageChange: {
        activeRequest: activePackageRequest
          ? formatPackageChangeRequestForCompany(activePackageRequest, company)
          : null,
        recentRequests: recentPackageRequests.map((item) =>
          formatPackageChangeRequestForCompany(item, company),
        ),
        lastAppliedRequest: appliedPackageChange
          ? formatPackageChangeRequestForCompany(appliedPackageChange, company)
          : null,
        canRequestNewChange: !activePackageRequest,
      },
      reviews: reviews.map((item) => formatCompanyReview(item)),
      tracking: {
        totalJobs: jobs.length,
        activeApprovedJobs: approvedJobs.filter((job) => job.isActive).length,
        pendingApprovals: pendingJobs.length,
        rejectedJobs: rejectedJobs.length,
        packageOverflowRequests: pendingJobs.filter((job) => job.requiresPackageOverride).length,
        totalApplications: applications.length,
        uniqueCandidates: candidateIds.length,
        followers: followers.length,
      },
      jobs: jobRows,
      applications: applicationRows,
      followers: followers.map((profile) => ({
        candidateId: String(profile.userId?._id || profile.userId || ""),
        candidateName: profile.userId?.name || "Candidate",
        candidateEmail: profile.userId?.email || "",
        candidatePhone: profile.phone || "",
        candidateCurrentTitle: profile.currentTitle || "",
        candidateExperience: profile.totalExperience || "",
        candidateCity: profile.currentCity || "",
        candidateState: profile.currentState || "",
        followedAt: profile.updatedAt || null,
        lastUpdated: formatRelativeTime(profile.updatedAt),
      })),
    },
  });
});

exports.updateAbout = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);
  const about = toTrimmedString(req.body.about);
  const website = toTrimmedString(req.body.website);
  const companySize = toTrimmedString(req.body.companySize);
  const industry = toTrimmedString(req.body.industry);

  if (!about) {
    throw createHttpError(400, "About text is required");
  }

  company.about = about;
  if (website) company.website = website;
  if (companySize) company.companySize = companySize;
  if (industry) company.industry = industry;

  await company.save();
  const { packageSnapshot } = await syncCompanyPackageContext(company);

  res.status(200).json({
    success: true,
    message: "About section updated successfully",
    data: {
      company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
    },
  });
});

exports.createJob = asyncHandler(async (req, res) => {
  const { user, company } = await resolveClientUserAndCompany(req.user._id);
  const { packageSnapshot } = await syncCompanyPackageContext(company);

  if (company.status === "INACTIVE") {
    throw createHttpError(403, "Company profile is inactive");
  }

  const title = toTrimmedString(req.body.title);
  if (!title) {
    throw createHttpError(400, "Job title is required");
  }

  const activeApprovedCount = await Job.countDocuments({
    companyId: company._id,
    isActive: true,
    approvalStatus: "APPROVED",
  });
  const hasAvailablePackageSlot = activeApprovedCount < Number(packageSnapshot.jobLimit || 0);

  const rawSkills = Array.isArray(req.body.skills)
    ? req.body.skills
    : String(req.body.skills || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

  const deadlineInput = toTrimmedString(req.body.deadline);
  const deadline = deadlineInput ? new Date(deadlineInput) : null;
  if (deadlineInput && Number.isNaN(deadline?.getTime())) {
    throw createHttpError(400, "Deadline must be a valid date");
  }

  const job = await Job.create({
    companyId: company._id,
    title,
    summary: toTrimmedString(req.body.summary),
    department: toTrimmedString(req.body.department),
    jobType: toTrimmedString(req.body.jobType),
    workplaceType: toTrimmedString(req.body.workplaceType),
    location: toTrimmedString(req.body.location),
    experience: toTrimmedString(req.body.experience),
    salaryMin: toSafeNumber(req.body.salaryMin, 0),
    salaryMax: toSafeNumber(req.body.salaryMax, 0),
    skills: rawSkills,
    deadline,
    description: toTrimmedString(req.body.description),
    approvalStatus: hasAvailablePackageSlot ? "APPROVED" : "PENDING",
    rejectionReason: "",
    createdBySource: "CLIENT",
    createdByClient: user._id,
    publishedByCRMAt: hasAvailablePackageSlot ? new Date() : null,
    packageSlotCount: hasAvailablePackageSlot ? 1 : 0,
    requiresPackageOverride: !hasAvailablePackageSlot,
    isActive: hasAvailablePackageSlot,
  });

  const nextActiveCount = hasAvailablePackageSlot ? activeApprovedCount + 1 : activeApprovedCount;
  const shouldPersist =
    packageSnapshot.dirty ||
    Number(company.activeJobCount || 0) !== nextActiveCount ||
    Number(company.openRoles || 0) !== nextActiveCount;

  company.activeJobCount = nextActiveCount;
  company.openRoles = company.activeJobCount;
  if (shouldPersist) {
    await company.save();
  }

  res.status(201).json({
    success: true,
    message: hasAvailablePackageSlot
      ? "Job posted successfully."
      : "Package limit reached. Job has been sent to CRM for approval.",
    data: {
      id: String(job._id),
      title: job.title,
      approvalStatus: job.approvalStatus,
      requiresPackageOverride: job.requiresPackageOverride,
      isActive: job.isActive,
      createdAt: job.createdAt,
    },
  });
});

exports.getPackageChangeRequests = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);
  await syncCompanyPackageContext(company);

  const statusFilter = String(req.query.status || "").trim().toUpperCase();
  if (statusFilter && !["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(statusFilter)) {
    throw createHttpError(400, "Invalid status filter for package change requests");
  }

  const query = { companyId: company._id };
  if (statusFilter && statusFilter !== "ALL") {
    query.status = statusFilter;
  }

  const requests = await PackageChangeRequest.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .select(
      "currentPackageType requestedPackageType currentJobLimit requestedJobLimit status isUpgrade reason decisionNote effectiveAt appliedAt reviewedAt createdAt updatedAt",
    );

  const activeRequest = requests.find(
    (item) =>
      item.status === "PENDING" ||
      (item.status === "APPROVED" && !item.appliedAt),
  );

  res.status(200).json({
    success: true,
    data: {
      activeRequest: activeRequest
        ? formatPackageChangeRequestForCompany(activeRequest, company)
        : null,
      items: requests.map((item) => formatPackageChangeRequestForCompany(item, company)),
    },
  });
});

exports.createPackageChangeRequest = asyncHandler(async (req, res) => {
  const { user, company } = await resolveClientUserAndCompany(req.user._id);
  const { packageCatalog, packageLimitMap, packageSnapshot } = await syncCompanyPackageContext(company);

  const requestedPackageType = normalizePackageName(req.body.packageType, "");
  const reason = toTrimmedString(req.body.reason);

  if (!requestedPackageType || !PACKAGE_TYPES.includes(requestedPackageType)) {
    throw createHttpError(400, "Select a valid target package");
  }

  if (requestedPackageType === packageSnapshot.packageType) {
    throw createHttpError(400, "You are already on this package");
  }

  const requestedJobLimit = Number(packageLimitMap.get(requestedPackageType) || 0);
  if (!requestedJobLimit) {
    throw createHttpError(404, "Requested package is not configured");
  }

  const pendingRequest = await PackageChangeRequest.findOne({
    companyId: company._id,
    status: "PENDING",
  }).select("_id");

  if (pendingRequest) {
    throw createHttpError(409, "A package change request is already pending CRM review");
  }

  const currentPackageType = normalizePackageName(company.packageType, "STANDARD");
  const currentJobLimit = Number(
    resolveCompanyJobLimit(
      { packageType: currentPackageType, jobLimit: packageSnapshot.jobLimit },
      packageLimitMap,
    ),
  );
  const isUpgrade = requestedJobLimit > currentJobLimit;
  const effectiveAt = buildPackageChangeEffectiveAt({
    isUpgrade,
    requestedEffectiveAt: req.body.effectiveAt,
  });

  const createdRequest = await PackageChangeRequest.create({
    companyId: company._id,
    requestedBy: user._id,
    currentPackageType,
    requestedPackageType,
    currentJobLimit,
    requestedJobLimit,
    reason,
    status: "PENDING",
    isUpgrade,
    effectiveAt,
    metadata: {
      source: "COMPANY_PANEL",
      packageCatalogVersion: packageCatalog.map((item) => ({
        name: item.name,
        jobLimit: item.jobLimit,
      })),
    },
  });

  const hydratedRequest = await PackageChangeRequest.findById(createdRequest._id).select(
    "currentPackageType requestedPackageType currentJobLimit requestedJobLimit status isUpgrade reason decisionNote effectiveAt appliedAt reviewedAt createdAt updatedAt",
  );

  res.status(201).json({
    success: true,
    message: isUpgrade
      ? "Upgrade request submitted to CRM for approval."
      : "Downgrade request submitted. CRM will review and schedule the change for the next billing window.",
    data: formatPackageChangeRequestForCompany(hydratedRequest, company),
  });
});

exports.getApplications = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);

  const page = toPositiveInteger(req.query.page, 1, 1, 100000);
  const limit = toPositiveInteger(req.query.limit, 10, 1, 50);
  const requestedStatus = normalizeApplicationStatus(req.query.status);
  const statusFilter = String(req.query.status || "").trim().toUpperCase();

  if (statusFilter && statusFilter !== "ALL" && !requestedStatus) {
    throw createHttpError(
      400,
      `Invalid status filter. Allowed values: ALL, ${APPLICATION_STATUS_ENUM.join(", ")}`,
    );
  }

  const query = {
    companyId: company._id,
  };

  if (requestedStatus) {
    query.status = requestedStatus;
  }

  const skip = (page - 1) * limit;

  const [applications, filteredCount, statusBreakdown] = await Promise.all([
    Application.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("jobId", "title")
      .populate("candidateId", "name email"),
    Application.countDocuments(query),
    Application.aggregate([
      {
        $match: {
          companyId: company._id,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const candidateIds = [
    ...new Set(applications.map((application) => getCandidateIdFromApplication(application)).filter(Boolean)),
  ];

  const candidateProfiles = candidateIds.length
    ? await CandidateProfile.find({ userId: { $in: candidateIds } }).select(
        "userId phone currentTitle totalExperience currentCity currentState resume",
      )
    : [];

  const profileMap = new Map(
    candidateProfiles.map((profile) => [String(profile.userId), profile]),
  );
  const items = applications.map((application) => formatCompanyApplication(application, profileMap));

  const totalPages = Math.max(1, Math.ceil(filteredCount / limit));
  const pageValue = Math.min(page, totalPages);

  const summaryByStatus = APPLICATION_STATUS_ENUM.reduce(
    (accumulator, status) => ({
      ...accumulator,
      [status]: 0,
    }),
    {},
  );

  statusBreakdown.forEach((item) => {
    const status = normalizeApplicationStatus(item?._id);
    if (status) {
      summaryByStatus[status] = Number(item.count || 0);
    }
  });

  res.status(200).json({
    success: true,
    data: {
      statuses: APPLICATION_STATUS_ENUM,
      filters: {
        status: requestedStatus || "ALL",
      },
      summary: {
        total: APPLICATION_STATUS_ENUM.reduce(
          (count, status) => count + Number(summaryByStatus[status] || 0),
          0,
        ),
        byStatus: summaryByStatus,
      },
      pagination: {
        page: pageValue,
        limit,
        totalItems: filteredCount,
        totalPages,
        hasPrevPage: pageValue > 1,
        hasNextPage: pageValue < totalPages,
      },
      items,
    },
  });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);

  const applicationId = toTrimmedString(req.params.applicationId);
  if (!applicationId) {
    throw createHttpError(400, "Application id is required");
  }

  const requestedStatus = normalizeApplicationStatus(req.body.status);
  if (!requestedStatus) {
    throw createHttpError(
      400,
      `Invalid status value. Allowed statuses: ${APPLICATION_STATUS_ENUM.join(", ")}`,
    );
  }

  const application = await Application.findOne({
    _id: applicationId,
    companyId: company._id,
  })
    .populate("jobId", "title")
    .populate("candidateId", "name email");

  if (!application) {
    throw createHttpError(404, "Application not found");
  }

  const previousStatus = normalizeApplicationStatus(application.status) || "APPLIED";
  const hasStatusChanged = previousStatus !== requestedStatus;

  if (hasStatusChanged) {
    application.status = requestedStatus;
    await application.save();
  }

  const candidateId = getCandidateIdFromApplication(application);
  if (candidateId && hasStatusChanged) {
    await CandidateNotification.create({
      candidateId,
      companyId: company._id,
      jobId: application.jobId?._id || application.jobId || null,
      applicationId: application._id,
      title: "Application status updated",
      message: `${company.name || "The company"} marked your application for ${
        application.jobId?.title || "the role"
      } as ${formatApplicationStatusLabel(requestedStatus)}.`,
      category: "APPLICATION",
      actionUrl: "/candidate/applications",
      metadata: {
        source: "COMPANY_PANEL",
        previousStatus,
        currentStatus: requestedStatus,
      },
    });
  }

  const candidateProfiles = candidateId
    ? await CandidateProfile.find({ userId: { $in: [candidateId] } }).select(
        "userId phone currentTitle totalExperience currentCity currentState resume",
      )
    : [];
  const profileMap = new Map(
    candidateProfiles.map((profile) => [String(profile.userId), profile]),
  );

  res.status(200).json({
    success: true,
    message:
      !hasStatusChanged
        ? "Application status is already up to date."
        : "Application status updated successfully.",
    data: formatCompanyApplication(application, profileMap),
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const { user, company } = await resolveClientUserAndCompany(req.user._id);
  const { packageSnapshot } = await syncCompanyPackageContext(company);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: String(user._id),
        username: user.name || "",
        email: user.email || "",
      },
      company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { user, company } = await resolveClientUserAndCompany(req.user._id);

  const nextUsername = toTrimmedString(req.body.username);
  const nextUserEmail = toTrimmedString(req.body.email).toLowerCase();
  const nextCompanyEmail = toTrimmedString(req.body.companyEmail).toLowerCase();

  if (nextUsername) {
    user.name = nextUsername;
  }

  if (nextUserEmail && nextUserEmail !== user.email) {
    const existingUser = await User.findOne({
      email: nextUserEmail,
      _id: { $ne: user._id },
    }).select("_id");

    if (existingUser) {
      throw createHttpError(409, "Another account already uses this email");
    }

    user.email = nextUserEmail;
  }

  const currentPassword = toTrimmedString(req.body.currentPassword);
  const newPassword = toTrimmedString(req.body.newPassword);
  if (currentPassword || newPassword) {
    if (!currentPassword || !newPassword) {
      throw createHttpError(400, "Current password and new password are required to update password");
    }

    const currentUserWithPassword = await User.findById(user._id).select("+password");
    const passwordMatches = await bcrypt.compare(currentPassword, currentUserWithPassword.password);
    if (!passwordMatches) {
      throw createHttpError(400, "Current password is incorrect");
    }

    currentUserWithPassword.password = await bcrypt.hash(newPassword, 10);
    await currentUserWithPassword.save();
  }

  if (nextCompanyEmail && nextCompanyEmail !== company.email) {
    const existingCompany = await Company.findOne({
      email: nextCompanyEmail,
      _id: { $ne: company._id },
    }).select("_id");

    if (existingCompany) {
      throw createHttpError(409, "Another company already uses this company email");
    }

    company.email = nextCompanyEmail;
  }

  company.phone = toTrimmedString(req.body.phone) || company.phone;
  company.industry = toTrimmedString(req.body.industry) || company.industry;
  company.website = toTrimmedString(req.body.website) || company.website;
  company.linkedIn = toTrimmedString(req.body.linkedIn) || company.linkedIn;
  company.about = toTrimmedString(req.body.about) || company.about;
  company.companySize = toTrimmedString(req.body.companySize) || company.companySize;

  company.location = {
    ...(company.location || {}),
    city: toTrimmedString(req.body.city) || company.location?.city || "",
    region: toTrimmedString(req.body.region) || company.location?.region || "",
    zone: toTrimmedString(req.body.zone) || company.location?.zone || "",
    address: toTrimmedString(req.body.address) || company.location?.address || "",
    pincode: toTrimmedString(req.body.pincode) || company.location?.pincode || "",
  };

  await Promise.all([user.save(), company.save()]);

  const { packageSnapshot } = await syncCompanyPackageContext(company);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: {
        id: String(user._id),
        username: user.name || "",
        email: user.email || "",
      },
      company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
    },
  });
});

exports.updateCompanyMedia = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);
  const kind = String(req.body.kind || "").trim().toLowerCase() === "cover" ? "cover" : "logo";

  if (!req.file) {
    throw createHttpError(400, "Please upload an image file");
  }

  const previousPublicId = kind === "cover" ? company.coverImagePublicId : company.logoPublicId;
  const uploaded = await uploadCompanyMedia(req.file, { ownerId: company._id, kind });

  if (kind === "cover") {
    company.coverImageUrl = uploaded.url;
    company.coverImagePublicId = uploaded.publicId;
  } else {
    company.logoUrl = uploaded.url;
    company.logoPublicId = uploaded.publicId;
  }

  await company.save();

  if (previousPublicId && previousPublicId !== uploaded.publicId) {
    await destroyCompanyMedia(previousPublicId);
  }

  const { packageSnapshot } = await syncCompanyPackageContext(company);

  res.status(200).json({
    success: true,
    message: `${kind === "cover" ? "Cover" : "Profile"} image updated successfully`,
    data: {
      company: formatCompanyForClient(company, { jobLimit: packageSnapshot.jobLimit }),
    },
  });
});

exports.previewApplicationResume = asyncHandler(async (req, res) => {
  const { company } = await resolveClientUserAndCompany(req.user._id);
  const applicationId = String(req.params.applicationId || "").trim();

  if (!applicationId) {
    throw createHttpError(400, "Application id is required");
  }

  const application = await Application.findOne({
    _id: applicationId,
    companyId: company._id,
  }).select("candidateId resumeUrl resumeFileName");

  if (!application) {
    throw createHttpError(404, "Application not found");
  }

  let resumeUrl = String(application.resumeUrl || "").trim();
  let resumeFileName = String(application.resumeFileName || "").trim();

  if (!resumeUrl && application.candidateId) {
    const candidateProfile = await CandidateProfile.findOne({
      userId: application.candidateId,
    }).select("resume");

    if (candidateProfile?.resume?.url) {
      resumeUrl = String(candidateProfile.resume.url || "").trim();
      resumeFileName = String(candidateProfile.resume.fileName || "").trim();
    }
  }

  if (!resumeUrl) {
    throw createHttpError(404, "Resume not found for this application");
  }

  let upstream;
  try {
    upstream = await axios({
      method: "get",
      url: resumeUrl,
      responseType: "stream",
    });
  } catch {
    throw createHttpError(502, "Unable to fetch resume from storage");
  }

  const upstreamContentType = String(upstream.headers?.["content-type"] || "").trim();
  if (
    !isLikelyPdf({
      fileName: resumeFileName,
      url: resumeUrl,
      contentType: upstreamContentType,
    })
  ) {
    throw createHttpError(
      415,
      "Resume is not in PDF format. Please upload PDF resumes for preview support.",
    );
  }

  const safeFileNameBase = String(resumeFileName || "candidate-resume")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_{2,}/g, "_");
  const safeFileName = safeFileNameBase.toLowerCase().endsWith(".pdf")
    ? safeFileNameBase
    : `${safeFileNameBase}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");

  upstream.data.pipe(res);
});
