const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const axios = require("axios");
const streamifier = require("streamifier");
const asyncHandler = require("../middleware/async.middleware");
const CrmUser = require("../models/CrmUser");
const Company = require("../models/Company");
const User = require("../models/User");
const Job = require("../models/Job");
const Package = require("../models/Package");
const QRCode = require("../models/QRCode");
const Application = require("../models/Application");
const CandidateProfile = require("../models/CandidateProfile");
const CrmCampaign = require("../models/CrmCampaign");
const CandidateNotification = require("../models/CandidateNotification");
const PackageChangeRequest = require("../models/PackageChangeRequest");
const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");
const cloudinary = require("../config/cloudinary");
const { generateCompanyQRPDF } = require("../services/pdf.service");
const {
  DEFAULT_PACKAGE_CATALOG,
  loadPackageCatalog,
  applyCompanyPackageSnapshot,
  resolveCompanyJobLimit,
  normalizePackageName,
} = require("../services/package-limit.service");
const {
  buildPackageChangeEffectiveAt,
  formatPackageChangeRequest,
  applyDueApprovedPackageChangesForCompany,
  normalizeRequestStatus,
} = require("../services/package-change-request.service");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");

const defaultPackages = DEFAULT_PACKAGE_CATALOG;
const CRM_DASHBOARD_FEED_LIMIT = 24;
const PACKAGE_ROLLOUT_MODES = {
  APPLY_FOR_EVERYONE: "APPLY_FOR_EVERYONE",
  APPLY_AFTER_EXHAUSTION: "APPLY_AFTER_EXHAUSTION",
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

const createTemporaryPassword = () =>
  Math.random().toString(36).slice(-10);

const getCandidateWebUrl = () =>
  process.env.CANDIDATE_WEB_URL || process.env.FRONTEND_URL;

const normalizeClientStatus = (value = "ACTIVE") => {
  const normalized = value.toUpperCase();
  return ["ACTIVE", "INACTIVE"].includes(normalized) ? normalized : "ACTIVE";
};

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveCandidateStatus = (candidateUser = {}) => {
  if (candidateUser.accessStatus === "PENDING_INVITE") {
    return "PENDING_INVITE";
  }

  if (!candidateUser.isActive || candidateUser.accessStatus === "RESTRICTED") {
    return "RESTRICTED";
  }

  return "ACTIVE";
};

const resolveMostRecentDate = (...values) => {
  const dates = values
    .map((value) => (value ? new Date(value) : null))
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));

  if (!dates.length) {
    return null;
  }

  return dates.reduce((latest, current) => (current > latest ? current : latest), dates[0]);
};

const formatCandidateRecord = ({
  candidateUser,
  candidateProfile = null,
  applicationSummary = null,
} = {}) => {
  const status = resolveCandidateStatus(candidateUser);
  const lastUpdatedAt = resolveMostRecentDate(
    candidateUser?.updatedAt,
    candidateProfile?.updatedAt,
    applicationSummary?.lastAppliedAt,
    candidateProfile?.resume?.uploadedAt,
  );

  return {
    id: String(candidateUser?._id || ""),
    candidateName: candidateUser?.name || "Candidate",
    candidateEmail: candidateUser?.email || "",
    status,
    accessStatus: candidateUser?.accessStatus || "ACTIVE",
    isActive: Boolean(candidateUser?.isActive),
    candidatePhone: candidateProfile?.phone || "",
    candidateAltPhone: candidateProfile?.altPhone || "",
    candidateDesignation: candidateProfile?.currentTitle || "",
    candidateCurrentCompany: candidateProfile?.currentCompany || "",
    candidateExperience: candidateProfile?.totalExperience || "",
    candidateCity: candidateProfile?.currentCity || "",
    candidateState: candidateProfile?.currentState || "",
    candidateCountry: candidateProfile?.currentCountry || "",
    candidateSkillsCount: Array.isArray(candidateProfile?.skills) ? candidateProfile.skills.length : 0,
    candidateSkills: Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : [],
    resumeAvailable: Boolean(candidateProfile?.resume?.url),
    resumeFileName: candidateProfile?.resume?.fileName || "",
    resumeUploadedAt: candidateProfile?.resume?.uploadedAt || null,
    totalApplications: Number(applicationSummary?.totalApplications || 0),
    lastAppliedAt: applicationSummary?.lastAppliedAt || null,
    createdAt: candidateUser?.createdAt || null,
    updatedAt: lastUpdatedAt,
    lastUpdated: formatRelativeTime(lastUpdatedAt),
  };
};

const ensureCrmSetup = async () => {
  await Promise.all(
    defaultPackages.map((pkg) =>
      Package.findOneAndUpdate(
        { name: pkg.name },
        { $setOnInsert: pkg },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      ),
    ),
  );
};

const formatCrmUser = (user) => ({
  id: String(user._id),
  fullName: user.fullName,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  department: user.department || "",
  scope: user.scope || "",
  territory: user.territory || user.scope || "",
  state: user.state || user.department || "",
  accessStatus: user.accessStatus || "ACTIVE",
});

const isFseOperator = (user = {}) => String(user?.role || "").toUpperCase() === "FSE";

const assertOwnedByRequesterForFse = (
  ownerId,
  user,
  message = "You are not allowed to access this record.",
) => {
  if (!isFseOperator(user)) {
    return;
  }

  if (!ownerId || String(ownerId) !== String(user?._id)) {
    throw createHttpError(403, message);
  }
};

const getCompanyVisibilityFilter = (user) =>
  isFseOperator(user) ? { createdByCRM: user._id } : {};

const getQrVisibilityFilter = (user) =>
  isFseOperator(user) ? { createdByCRM: user._id } : {};

const formatClient = (company, clientUser = null, options = {}) => {
  const effectiveJobLimit = Number(
    options?.jobLimit !== undefined ? options.jobLimit : company.jobLimit || 0,
  );

  return {
  id: String(company._id),
  name: company.name,
  logoUrl: company.logoUrl || "",
  industry: company.industry || "General",
  packageType: company.packageType || "STANDARD",
  jobLimit: effectiveJobLimit,
  activeJobCount: company.activeJobCount || 0,
  status: company.status,
  email: company.email,
  phone: company.phone || "",
  city: company.location?.city || "",
  region: company.location?.region || "",
  zone: company.location?.zone || "",
  accountManager: company.accountManager || "",
  configurationNotes: company.configurationNotes || "",
  createdByCRM: company.createdByCRM ? String(company.createdByCRM) : "",
  clientUser: clientUser
    ? {
        id: String(clientUser._id),
        name: clientUser.name,
        email: clientUser.email,
        accessStatus: clientUser.accessStatus || "ACTIVE",
      }
    : null,
  updatedAt: company.updatedAt,
  lastUpdated: formatRelativeTime(company.updatedAt),
  };
};

const formatPackageChangeRequestForCrm = (request) =>
  formatPackageChangeRequest(request, {
    companyName: request?.companyId?.name || "",
    requestedByName: request?.requestedBy?.name || "",
    reviewedByName: request?.reviewedBy?.fullName || "",
  });

const syncLivePackageContextForCompany = async (company, packageLimitMap = new Map()) => {
  const appliedResult = await applyDueApprovedPackageChangesForCompany(company, packageLimitMap);
  const snapshot = applyCompanyPackageSnapshot(company, packageLimitMap);

  if (appliedResult.updated || snapshot.dirty) {
    await company.save();
  }

  return {
    snapshot,
    appliedPackageChange: appliedResult.lastAppliedRequest || null,
  };
};

const formatJob = (job) => ({
  id: String(job._id),
  title: job.title,
  companyId: String(job.companyId?._id || job.companyId),
  companyName: job.companyId?.name || "Unknown company",
  department: job.department || "General",
  jobType: job.jobType || "",
  workplaceType: job.workplaceType || "",
  location: job.location || "",
  experience: job.experience || "",
  salaryMin: Number(job.salaryMin || 0),
  salaryMax: Number(job.salaryMax || 0),
  summary: job.summary || "",
  skills: Array.isArray(job.skills) ? job.skills : [],
  deadline: job.deadline || null,
  description: job.description || "",
  approvalStatus: job.approvalStatus || "APPROVED",
  rejectionReason: job.rejectionReason || "",
  isActive: Boolean(job.isActive),
  createdBySource: job.createdBySource || "CRM",
  requiresPackageOverride: Boolean(job.requiresPackageOverride),
  createdAt: job.createdAt,
  lastUpdated: formatRelativeTime(job.updatedAt),
});

const formatQRCodeRecord = (qrCode) => ({
  id: String(qrCode._id),
  token: qrCode.token,
  companyName: qrCode.companyId?.name || "Unknown company",
  companyId: String(qrCode.companyId?._id || qrCode.companyId),
  jobId: qrCode.jobId?._id ? String(qrCode.jobId._id) : qrCode.jobId ? String(qrCode.jobId) : "",
  jobTitle: qrCode.jobId?.title || "Company landing",
  qrImageUrl: qrCode.qrImageUrl,
  pdfUrl: qrCode.pdfUrl || "",
  scans: qrCode.scans || 0,
  isActive: qrCode.isActive,
  shareChannel: qrCode.shareChannel || "",
  sharedWithEmail: qrCode.sharedWithEmail || "",
  lastSharedAt: qrCode.lastSharedAt,
  createdByCRM: qrCode.createdByCRM ? String(qrCode.createdByCRM) : "",
  createdAt: qrCode.createdAt,
});

const formatQRCodeCompany = (company) => ({
  id: String(company._id),
  name: company.name,
  logoUrl: company.logoUrl || "",
  tagline: company.tagline || "",
  industry: company.industry || "",
  website: company.website || "",
  linkedIn: company.linkedIn || "",
  email: company.email || "",
  phone: company.phone || "",
  altPhone: company.altPhone || "",
  location: {
    region: company.location?.region || "",
    city: company.location?.city || "",
    zone: company.location?.zone || "",
    address: company.location?.address || "",
    pincode: company.location?.pincode || "",
  },
  about: company.about || "",
  mission: company.mission || "",
  vision: company.vision || "",
  whyJoinUs: Array.isArray(company.whyJoinUs)
    ? company.whyJoinUs.map((item) => ({
        icon: item.icon || "",
        title: item.title || "",
        desc: item.desc || "",
      }))
    : [],
});

const resolveQRCode = async (identifier) => {
  if (!identifier) return null;

  const byId = await QRCode.findById(identifier)
    .populate("companyId")
    .populate("jobId", "title");
  if (byId) return byId;

  return QRCode.findOne({ token: identifier })
    .populate("companyId")
    .populate("jobId", "title");
};

const formatApplication = (application, candidateUser, candidateProfile = null) => {
  const profileResume = candidateProfile?.resume || {};
  const resumeUrl = application.resumeUrl || profileResume.url || "";
  const resumeFileName = application.resumeFileName || profileResume.fileName || "";

  // For old documents created before timestamps were enforced, derive the
  // creation time from the ObjectId hex prefix (12-byte BSON, first 4 bytes = epoch seconds)
  const derivedCreatedAt = (() => {
    if (application.createdAt) return application.createdAt;
    if (application.updatedAt) return application.updatedAt;
    try {
      const hexTimestamp = String(application._id).substring(0, 8);
      const epochSeconds = parseInt(hexTimestamp, 16);
      if (epochSeconds > 0) return new Date(epochSeconds * 1000);
    } catch {
      // ignore
    }
    return null;
  })();

  return {
    id: String(application._id),
    companyName: application.companyId?.name || "Unknown company",
    jobTitle: application.jobId?.title || "Unknown job",
    candidateId: String(application.candidateId || ""),
    candidateName: candidateUser?.name || "Candidate",
    candidateEmail: candidateUser?.email || "",
    candidatePhone: candidateProfile?.phone || "",
    candidateAltPhone: candidateProfile?.altPhone || "",
    candidateDesignation: candidateProfile?.currentTitle || "",
    candidateHeadline: candidateProfile?.headline || "",
    candidateSummary: candidateProfile?.summary || "",
    candidateExperience: candidateProfile?.totalExperience || "",
    candidateCurrentCompany: candidateProfile?.currentCompany || "",
    candidateCity: candidateProfile?.currentCity || "",
    candidateState: candidateProfile?.currentState || "",
    candidateCountry: candidateProfile?.currentCountry || "",
    candidateSkills: Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : [],
    resumeUrl,
    resumeFileName,
    resumeStorageProvider: profileResume.storageProvider || "",
    resumeUploadedAt: profileResume.uploadedAt || null,
    sourceQrToken: application.sourceQrToken || "",
    sourceJobId: application.sourceJobId ? String(application.sourceJobId) : "",
    status: application.status,
    appliedAt: derivedCreatedAt,
    updatedAt: application.updatedAt || derivedCreatedAt,
    lastUpdated: formatRelativeTime(application.updatedAt || derivedCreatedAt),
  };
};

const uploadPdfBuffer = async (pdfBuffer, { token, publicId } = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId || `crm_qr_pdfs/crm_qr_${token}`,
        format: "pdf",
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
  });

const uploadCompanyLogo = async (file, ownerId) =>
  new Promise((resolve, reject) => {
    const publicId = `logo_${String(ownerId || "crm")}_${crypto.randomUUID()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "company_logos",
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          logoUrl: result?.secure_url || "",
          logoPublicId: result?.public_id || "",
        });
      },
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });

const destroyCompanyLogo = async (publicId) => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.warn("Logo cleanup failed:", error?.message || error);
  }
};

const syncCompanyCapacity = async (companyId) => {
  const [company, activeJobCount] = await Promise.all([
    Company.findById(companyId),
    Job.countDocuments({
      companyId,
      isActive: true,
      approvalStatus: "APPROVED",
    }),
  ]);

  if (!company) {
    return null;
  }

  company.activeJobCount = activeJobCount;
  company.openRoles = activeJobCount;
  await company.save();

  return company;
};

const createQrKitForCompany = async ({ companyId, jobId = null, createdByCRM }) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }

  const jobs = jobId
    ? await Job.find({
        _id: jobId,
        companyId,
        isActive: true,
        approvalStatus: "APPROVED",
      })
    : await Job.find({
        companyId,
        isActive: true,
        approvalStatus: "APPROVED",
      });

  const token = crypto.randomUUID();
  const redirectUrl = `${getCandidateWebUrl()}/landing/${token}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    redirectUrl,
  )}`;

  const pdfBuffer = await generateCompanyQRPDF({
    company,
    jobs,
    qrImageUrl,
  });
  const uploadedPdf = await uploadPdfBuffer(pdfBuffer, { token });

  const qrCode = await QRCode.create({
    companyId,
    jobId: jobId || null,
    token,
    qrImageUrl,
    pdfUrl: uploadedPdf.secure_url,
    pdfPublicId: uploadedPdf.public_id,
    createdByCRM,
    isActive: true,
  });

  return QRCode.findById(qrCode._id)
    .populate("companyId", "name")
    .populate("jobId", "title");
};

const createOrUpdateClientUser = async ({
  company,
  name,
  email,
  password,
  existingUser = null,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const hash = password ? await bcrypt.hash(password, 10) : null;

  if (existingUser) {
    existingUser.name = name.trim();
    existingUser.email = normalizedEmail;
    if (hash) {
      existingUser.password = hash;
    }
    existingUser.companyId = company._id;
    existingUser.role = "CLIENT";
    existingUser.isActive = true;
    existingUser.accessStatus = "ACTIVE";
    await existingUser.save();
    return existingUser;
  }

  return User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hash,
    role: "CLIENT",
    companyId: company._id,
    isActive: true,
    accessStatus: "ACTIVE",
  });
};

exports.login = asyncHandler(async (req, res) => {
  await ensureCrmSetup();

  const { email = "", password = "" } = req.body;

  if (!email.trim() || !password.trim()) {
    throw createHttpError(400, "Email and password are required");
  }

  const user = await CrmUser.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw createHttpError(404, "CRM account not found");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "CRM account is inactive");
  }

  const tokenPair = await issueTokenPair({
    user,
    source: "CRM",
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(200).json({
    success: true,
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: formatCrmUser(user),
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: formatCrmUser(req.user),
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  await ensureCrmSetup();

  const [
    companies,
    jobs,
    applications,
    packageContext,
    qrCodes,
    campaigns,
  ] = await Promise.all([
    Company.find().sort({ updatedAt: -1 }).limit(6),
    Job.find({ createdBySource: "CLIENT", approvalStatus: "PENDING" })
      .sort({ updatedAt: -1 })
      .limit(CRM_DASHBOARD_FEED_LIMIT)
      .populate("companyId", "name"),
    Application.find()
      .sort({ updatedAt: -1 })
      .limit(CRM_DASHBOARD_FEED_LIMIT)
      .populate("companyId", "name")
      .populate("jobId", "title"),
    loadPackageCatalog(),
    QRCode.find().sort({ updatedAt: -1 }).limit(6).populate("companyId", "name").populate("jobId", "title"),
    CrmCampaign.find().sort({ createdAt: -1 }).limit(6),
  ]);

  const { packageCatalog, packageLimitMap } = packageContext;
  const companySnapshots = await Promise.all(
    companies.map(async (company) => {
      const { snapshot } = await syncLivePackageContextForCompany(company, packageLimitMap);
      return {
        company,
        jobLimit: snapshot.jobLimit,
      };
    }),
  );

  const [companyCount, jobCount, candidateCount, applicationCount, pendingJobApprovals, pendingPackageChanges, packageChangeRequests] =
    await Promise.all([
      Company.countDocuments(),
      Job.countDocuments(),
      User.countDocuments({ role: "CANDIDATE" }),
      Application.countDocuments(),
      Job.countDocuments({ approvalStatus: "PENDING" }),
      PackageChangeRequest.countDocuments({ status: "PENDING" }),
      PackageChangeRequest.find({ status: "PENDING" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("companyId", "name packageType")
        .populate("requestedBy", "name")
        .populate("reviewedBy", "fullName"),
    ]);

  const activeQrCompanyIds = await QRCode.distinct("companyId", { isActive: true });
  const qrAssets = activeQrCompanyIds.length
    ? await Company.countDocuments({ _id: { $in: activeQrCompanyIds } })
    : 0;
  const qrCodeRecords = await QRCode.countDocuments({ isActive: true });
  const campaignCount = await CrmCampaign.countDocuments();

  const dashboardCandidateIds = [
    ...new Set(applications.map((application) => String(application.candidateId || ""))),
  ].filter(Boolean);
  const [dashboardCandidateUsers, dashboardCandidateProfiles] = await Promise.all([
    User.find({
      _id: { $in: dashboardCandidateIds },
    }).select("name email"),
    CandidateProfile.find({
      userId: { $in: dashboardCandidateIds },
    }).select(
      "userId phone altPhone currentTitle headline summary totalExperience currentCompany currentCity currentState currentCountry skills resume",
    ),
  ]);
  const dashboardCandidateMap = new Map(
    dashboardCandidateUsers.map((user) => [String(user._id), user]),
  );
  const dashboardCandidateProfileMap = new Map(
    dashboardCandidateProfiles.map((profile) => [String(profile.userId), profile]),
  );

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalClients: companyCount,
        totalJobs: jobCount,
        totalCandidates: candidateCount,
        totalApplications: applicationCount,
        pendingApprovals: pendingJobApprovals + pendingPackageChanges,
        pendingJobApprovals,
        pendingPackageChanges,
        qrCodes: qrAssets,
        qrCodeRecords,
        campaigns: campaignCount,
      },
      packageCards: packageCatalog.map((pkg) => ({
        name: pkg.name,
        jobLimit: pkg.jobLimit,
        description: pkg.description,
      })),
      clientOverview: companySnapshots.map((item) => ({
        name: item.company.name,
        packageType: item.company.packageType,
        activeJobCount: item.company.activeJobCount || 0,
        jobLimit: item.jobLimit || 0,
        status: item.company.status,
      })),
      jobApprovals: jobs.map(formatJob),
      packageChangeApprovals: packageChangeRequests.map(formatPackageChangeRequestForCrm),
      applicationFeed: applications.map((application) =>
        formatApplication(
          application,
          dashboardCandidateMap.get(String(application.candidateId)),
          dashboardCandidateProfileMap.get(String(application.candidateId)),
        ),
      ),
      qrOverview: qrCodes.map(formatQRCodeRecord),
      campaignFeed: campaigns.map((campaign) => ({
        id: String(campaign._id),
        title: campaign.title,
        audience: campaign.audience,
        channel: campaign.channel,
        sentCount: campaign.sentCount,
        createdAt: campaign.createdAt,
      })),
    },
  });
});

exports.getClients = asyncHandler(async (req, res) => {
  const companies = await Company.find(getCompanyVisibilityFilter(req.user))
    .sort({ updatedAt: -1 })
    .populate("clientUserId", "name email accessStatus");
  const { packageLimitMap } = await loadPackageCatalog();
  const syncedCompanies = await Promise.all(
    companies.map(async (company) => {
      const { snapshot } = await syncLivePackageContextForCompany(company, packageLimitMap);

      return {
        company,
        jobLimit: snapshot.jobLimit,
      };
    }),
  );

  res.status(200).json({
    success: true,
    data: syncedCompanies.map((item) =>
      formatClient(item.company, item.company.clientUserId, { jobLimit: item.jobLimit }),
    ),
  });
});

exports.createClient = asyncHandler(async (req, res) => {
  await ensureCrmSetup();

  const {
    name = "",
    industry = "",
    email = "",
    phone = "",
    city = "",
    region = "",
    zone = "",
    packageType = "STANDARD",
    configurationNotes = "",
    accountManager = "",
    clientName = "",
    clientEmail = "",
    clientPassword = "",
  } = req.body;

  if (!name.trim() || !email.trim() || !clientName.trim() || !clientEmail.trim()) {
    throw createHttpError(400, "Company and client identity fields are required");
  }

  const selectedPackage = await Package.findOne({ name: packageType.toUpperCase() });

  if (!selectedPackage) {
    throw createHttpError(404, "Package not found");
  }

  const existingCompany = await Company.findOne({ email: email.trim().toLowerCase() });
  if (existingCompany) {
    throw createHttpError(409, "Company already exists for this email");
  }

  const existingClientUser = await User.findOne({ email: clientEmail.trim().toLowerCase() });
  if (existingClientUser) {
    throw createHttpError(409, "Client credentials already exist for this email");
  }

  let uploadedLogo = null;
  let company = null;

  try {
    if (req.file) {
      uploadedLogo = await uploadCompanyLogo(req.file, req.user?._id);
    }

    company = await Company.create({
      name: name.trim(),
      industry: industry.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      logoUrl: uploadedLogo?.logoUrl || "",
      logoPublicId: uploadedLogo?.logoPublicId || "",
      location: {
        city: city.trim(),
        region: region.trim(),
        zone: zone.trim(),
      },
      packageType: selectedPackage.name,
      jobLimit: selectedPackage.jobLimit,
      configurationNotes: configurationNotes.trim(),
      accountManager: accountManager.trim(),
      createdByCRM: req.user._id,
      status: "ACTIVE",
    });

    const generatedPassword = clientPassword.trim() || createTemporaryPassword();
    const clientUser = await createOrUpdateClientUser({
      company,
      name: clientName,
      email: clientEmail,
      password: generatedPassword,
    });

    company.clientUserId = clientUser._id;
    await company.save();

    let qrCode = null;
    let qrGenerationError = "";

    try {
      qrCode = await createQrKitForCompany({
        companyId: company._id,
        createdByCRM: req.user._id,
      });
    } catch (error) {
      qrGenerationError = error?.message || "Unable to generate QR kit.";
    }

    EventBus.emit(EVENTS.RECRUITER_REGISTERED, {
      recruiterId: clientUser._id,
      email: clientUser.email,
      fullName: clientUser.name,
      companyId: company._id,
      companyName: company.name,
    });

    res.status(201).json({
      success: true,
      data: formatClient(company, clientUser),
      temporaryPassword: generatedPassword,
      qrCode: qrCode ? formatQRCodeRecord(qrCode) : null,
      qrGenerationError,
    });
  } catch (error) {
    if (uploadedLogo?.logoPublicId && !company?._id) {
      await destroyCompanyLogo(uploadedLogo.logoPublicId);
    }
    throw error;
  }
});

exports.updateClient = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).populate(
    "clientUserId",
    "name email accessStatus",
  );

  if (!company) {
    throw createHttpError(404, "Client company not found");
  }

  assertOwnedByRequesterForFse(
    company.createdByCRM,
    req.user,
    "You can only update client accounts created by you.",
  );

  const packageName = (req.body.packageType || company.packageType || "STANDARD").toUpperCase();
  const selectedPackage = await Package.findOne({ name: packageName });
  const { packageLimitMap } = await loadPackageCatalog();
  const previousLogoPublicId = company.logoPublicId || "";

  let uploadedLogo = null;
  let hasPersistedUpdate = false;

  if (req.file) {
    uploadedLogo = await uploadCompanyLogo(req.file, req.user?._id);
  }

  company.name = req.body.name?.trim() || company.name;
  company.industry = req.body.industry?.trim() || company.industry;
  company.email = req.body.email?.trim().toLowerCase() || company.email;
  company.phone = req.body.phone?.trim() || company.phone;
  company.status = normalizeClientStatus(req.body.status || company.status);
  company.packageType = selectedPackage?.name || company.packageType;
  company.jobLimit = Number(selectedPackage?.jobLimit || resolveCompanyJobLimit(company, packageLimitMap));
  company.configurationNotes =
    req.body.configurationNotes?.trim() ?? company.configurationNotes;
  company.accountManager = req.body.accountManager?.trim() ?? company.accountManager;
  company.location = {
    ...company.location,
    city: req.body.city?.trim() ?? company.location?.city,
    region: req.body.region?.trim() ?? company.location?.region,
    zone: req.body.zone?.trim() ?? company.location?.zone,
  };

  if (uploadedLogo?.logoUrl) {
    company.logoUrl = uploadedLogo.logoUrl;
    company.logoPublicId = uploadedLogo.logoPublicId || "";
  }

  try {
    await company.save();
    hasPersistedUpdate = true;
  } catch (error) {
    if (uploadedLogo?.logoPublicId) {
      await destroyCompanyLogo(uploadedLogo.logoPublicId);
    }
    throw error;
  }

  if (
    hasPersistedUpdate &&
    uploadedLogo?.logoPublicId &&
    previousLogoPublicId &&
    previousLogoPublicId !== uploadedLogo.logoPublicId
  ) {
    await destroyCompanyLogo(previousLogoPublicId);
  }

  res.status(200).json({
    success: true,
    data: formatClient(company, company.clientUserId),
  });
});

exports.updateClientCredentials = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company?.clientUserId) {
    throw createHttpError(404, "Client credentials not found");
  }

  assertOwnedByRequesterForFse(
    company.createdByCRM,
    req.user,
    "You can only update credentials for client accounts created by you.",
  );

  const clientUser = await User.findById(company.clientUserId);

  if (!clientUser) {
    throw createHttpError(404, "Client user not found");
  }

  const updatedUser = await createOrUpdateClientUser({
    company,
    name: req.body.clientName || clientUser.name,
    email: req.body.clientEmail || clientUser.email,
    password: req.body.clientPassword || "",
    existingUser: clientUser,
  });

  company.clientUserId = updatedUser._id;
  await company.save();

  res.status(200).json({
    success: true,
    data: formatClient(company, updatedUser),
  });
});

exports.getJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find().sort({ updatedAt: -1 }).populate("companyId", "name");

  res.status(200).json({
    success: true,
    data: jobs.map(formatJob),
  });
});

exports.createJob = asyncHandler(async (req, res) => {
  const {
    companyId = "",
    title = "",
    summary = "",
    department = "",
    jobType = "",
    workplaceType = "",
    location = "",
    experience = "",
    salaryMin = 0,
    salaryMax = 0,
    skills = [],
    deadline = null,
    description = "",
    createAsClient = false,
  } = req.body;

  if (!companyId || !title.trim()) {
    throw createHttpError(400, "Company and job title are required");
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }
  const { packageLimitMap } = await loadPackageCatalog();
  const { snapshot: packageSnapshot } = await syncLivePackageContextForCompany(
    company,
    packageLimitMap,
  );

  if (!createAsClient) {
    const activeCount = await Job.countDocuments({
      companyId: company._id,
      isActive: true,
      approvalStatus: "APPROVED",
    });

    if (activeCount >= packageSnapshot.jobLimit) {
      throw createHttpError(400, "Job limit exceeded for this package");
    }
  }

  const job = await Job.create({
    companyId: company._id,
    title: title.trim(),
    summary: summary.trim(),
    department: department.trim(),
    jobType: jobType.trim(),
    workplaceType: workplaceType.trim(),
    location: location.trim(),
    experience: experience.trim(),
    salaryMin: Number(salaryMin || 0),
    salaryMax: Number(salaryMax || 0),
    skills,
    deadline,
    description: description.trim(),
    approvalStatus: createAsClient ? "PENDING" : "APPROVED",
    createdBySource: createAsClient ? "CLIENT" : "CRM",
    createdByCRM: createAsClient ? null : req.user._id,
    createdByClient: createAsClient ? company.clientUserId || null : null,
    publishedByCRMAt: createAsClient ? null : new Date(),
    isActive: !createAsClient,
  });

  if (!createAsClient) {
    await syncCompanyCapacity(company._id);

    const clientUser = company.clientUserId
      ? await User.findById(company.clientUserId).select("email").lean()
      : null;
    if (clientUser?.email) {
      EventBus.emit(EVENTS.RECRUITER_JOB_POSTED, {
        email: clientUser.email,
        jobTitle: job.title,
        jobId: job._id,
      });
    }
  }

  const hydratedJob = await Job.findById(job._id).populate("companyId", "name");

  res.status(201).json({
    success: true,
    data: formatJob(hydratedJob),
  });
});

exports.updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate("companyId", "name activeJobCount");
  if (!job) {
    throw createHttpError(404, "Job not found");
  }

  const companyId = job.companyId?._id || job.companyId;
  const company = await Company.findById(companyId);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }
  const { packageLimitMap } = await loadPackageCatalog();
  const { snapshot: packageSnapshot } = await syncLivePackageContextForCompany(
    company,
    packageLimitMap,
  );

  job.title = req.body.title?.trim() ?? job.title;
  job.summary = req.body.summary?.trim() ?? job.summary;
  job.department = req.body.department?.trim() ?? job.department;
  job.jobType = req.body.jobType?.trim() ?? job.jobType;
  job.workplaceType = req.body.workplaceType?.trim() ?? job.workplaceType;
  job.location = req.body.location?.trim() ?? job.location;
  job.experience = req.body.experience?.trim() ?? job.experience;
  job.salaryMin = Number(req.body.salaryMin ?? job.salaryMin ?? 0);
  job.salaryMax = Number(req.body.salaryMax ?? job.salaryMax ?? 0);
  job.skills = req.body.skills ?? job.skills;
  job.deadline = req.body.deadline ?? job.deadline;
  job.description = req.body.description?.trim() ?? job.description;

  const nextIsActive =
    typeof req.body.isActive === "boolean" ? req.body.isActive : job.isActive;

  if (job.approvalStatus === "APPROVED" && nextIsActive && !job.isActive) {
    const activeCount = await Job.countDocuments({
      companyId: company._id,
      isActive: true,
      approvalStatus: "APPROVED",
      _id: { $ne: job._id },
    });

    if (activeCount >= packageSnapshot.jobLimit) {
      throw createHttpError(400, "Job limit exceeded for this package");
    }
  }

  job.isActive = nextIsActive;
  await job.save();

  if (job.approvalStatus === "APPROVED") {
    await syncCompanyCapacity(company._id);
  }

  res.status(200).json({
    success: true,
    data: formatJob(job),
  });
});

exports.getJobApprovals = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ approvalStatus: { $in: ["PENDING", "REJECTED"] } })
    .sort({ updatedAt: -1 })
    .populate("companyId", "name");

  res.status(200).json({
    success: true,
    data: jobs.map(formatJob),
  });
});

exports.updateJobApproval = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw createHttpError(404, "Job not found");
  }

  const company = await Company.findById(job.companyId);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }
  const { packageLimitMap } = await loadPackageCatalog();
  const { snapshot: packageSnapshot } = await syncLivePackageContextForCompany(
    company,
    packageLimitMap,
  );

  const decision = (req.body.decision || "").toUpperCase();

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw createHttpError(400, "Decision must be approve or reject");
  }

  if (decision === "APPROVE") {
    const activeCount = await Job.countDocuments({
      companyId: company._id,
      isActive: true,
      approvalStatus: "APPROVED",
      _id: { $ne: job._id },
    });

    const isApprovedOverflowRequest =
      job.createdBySource === "CLIENT" && job.requiresPackageOverride;

    if (activeCount >= packageSnapshot.jobLimit && !isApprovedOverflowRequest) {
      throw createHttpError(400, "Job limit exceeded for this package");
    }

    job.approvalStatus = "APPROVED";
    job.rejectionReason = "";
    job.isActive = true;
    job.publishedByCRMAt = new Date();
  } else {
    job.approvalStatus = "REJECTED";
    job.rejectionReason = req.body.rejectionReason?.trim() || "Rejected by CRM";
    job.isActive = false;
  }

  await job.save();
  await syncCompanyCapacity(company._id);

  if (decision === "APPROVE") {
    const clientUser = company.clientUserId
      ? await User.findById(company.clientUserId).select("email").lean()
      : null;
    if (clientUser?.email) {
      EventBus.emit(EVENTS.RECRUITER_JOB_POSTED, {
        email: clientUser.email,
        jobTitle: job.title,
        jobId: job._id,
      });
    }
  }

  const hydratedJob = await Job.findById(job._id).populate("companyId", "name");

  res.status(200).json({
    success: true,
    data: formatJob(hydratedJob),
  });
});

exports.getPackageChangeRequests = asyncHandler(async (req, res) => {
  const statusFilter = String(req.query.status || "PENDING").trim().toUpperCase();
  const normalizedStatus = normalizeRequestStatus(statusFilter);

  if (statusFilter !== "ALL" && !normalizedStatus) {
    throw createHttpError(400, "Invalid status filter for package change requests");
  }

  const companyFilter = getCompanyVisibilityFilter(req.user);
  const visibleCompanyIds = await Company.find(companyFilter).distinct("_id");
  const query = {
    companyId: { $in: visibleCompanyIds },
  };

  if (statusFilter !== "ALL") {
    query.status = normalizedStatus;
  }

  const requests = await PackageChangeRequest.find(query)
    .sort({ createdAt: -1 })
    .populate("companyId", "name packageType jobLimit createdByCRM")
    .populate("requestedBy", "name email")
    .populate("reviewedBy", "fullName email");

  res.status(200).json({
    success: true,
    data: requests.map(formatPackageChangeRequestForCrm),
  });
});

exports.updatePackageChangeRequest = asyncHandler(async (req, res) => {
  const requestId = String(req.params.id || "").trim();
  if (!requestId) {
    throw createHttpError(400, "Package change request id is required");
  }

  const decision = String(req.body.decision || "").trim().toUpperCase();
  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw createHttpError(400, "Decision must be APPROVE or REJECT");
  }

  const packageChangeRequest = await PackageChangeRequest.findById(requestId)
    .populate("companyId")
    .populate("requestedBy", "name email")
    .populate("reviewedBy", "fullName email");

  if (!packageChangeRequest || !packageChangeRequest.companyId) {
    throw createHttpError(404, "Package change request not found");
  }

  assertOwnedByRequesterForFse(
    packageChangeRequest.companyId?.createdByCRM,
    req.user,
    "You can only review package requests for client accounts created by you.",
  );

  if (packageChangeRequest.status !== "PENDING") {
    throw createHttpError(400, "This package change request is already resolved");
  }

  const company = await Company.findById(packageChangeRequest.companyId._id);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }

  const decisionNote = String(req.body.decisionNote || req.body.rejectionReason || "")
    .trim()
    .slice(0, 1200);

  if (decision === "REJECT" && !decisionNote) {
    throw createHttpError(400, "A rejection note is required");
  }

  const { packageLimitMap } = await loadPackageCatalog();
  const { snapshot } = await syncLivePackageContextForCompany(company, packageLimitMap);
  const targetPackageType = normalizePackageName(
    packageChangeRequest.requestedPackageType,
    company.packageType || "STANDARD",
  );
  const targetJobLimit = Number(
    resolveCompanyJobLimit(
      { packageType: targetPackageType, jobLimit: packageChangeRequest.requestedJobLimit },
      packageLimitMap,
    ),
  );
  const isUpgrade = targetJobLimit > Number(snapshot.jobLimit || 0);

  packageChangeRequest.reviewedBy = req.user._id;
  packageChangeRequest.reviewedAt = new Date();
  packageChangeRequest.decisionNote = decisionNote;
  packageChangeRequest.isUpgrade = isUpgrade;
  packageChangeRequest.currentPackageType = normalizePackageName(
    packageChangeRequest.currentPackageType,
    company.packageType || "STANDARD",
  );
  packageChangeRequest.currentJobLimit = Number(snapshot.jobLimit || packageChangeRequest.currentJobLimit || 0);
  packageChangeRequest.requestedPackageType = targetPackageType;
  packageChangeRequest.requestedJobLimit = targetJobLimit;

  if (decision === "REJECT") {
    packageChangeRequest.status = "REJECTED";
    await packageChangeRequest.save();
  } else {
    const effectiveAt = buildPackageChangeEffectiveAt({
      isUpgrade,
      requestedEffectiveAt: req.body.effectiveAt || packageChangeRequest.effectiveAt,
    });
    const shouldApplyNow = isUpgrade || effectiveAt.getTime() <= Date.now();

    packageChangeRequest.status = "APPROVED";
    packageChangeRequest.effectiveAt = effectiveAt;
    packageChangeRequest.appliedAt = shouldApplyNow ? new Date() : null;

    if (shouldApplyNow) {
      company.packageType = targetPackageType;
      company.jobLimit = targetJobLimit;
      company.grandfatheredJobLimit = 0;
      await company.save();
    }

    await packageChangeRequest.save();
  }

  const refreshed = await PackageChangeRequest.findById(packageChangeRequest._id)
    .populate("companyId", "name packageType jobLimit createdByCRM")
    .populate("requestedBy", "name email")
    .populate("reviewedBy", "fullName email");

  res.status(200).json({
    success: true,
    message:
      decision === "APPROVE"
        ? refreshed?.appliedAt
          ? "Package change approved and applied."
          : "Package change approved and scheduled."
        : "Package change request rejected.",
    data: formatPackageChangeRequestForCrm(refreshed),
  });
});

exports.getPackages = asyncHandler(async (req, res) => {
  await ensureCrmSetup();

  const packages = await Package.find().sort({ jobLimit: 1 });

  res.status(200).json({
    success: true,
    data: packages.map((pkg) => ({
      id: String(pkg._id),
      name: pkg.name,
      jobLimit: pkg.jobLimit,
      description: pkg.description || "",
    })),
  });
});

exports.upsertPackage = asyncHandler(async (req, res) => {
  const name = (req.params.name || req.body.name || "").toUpperCase();
  const rolloutMode = String(req.body.rolloutMode || PACKAGE_ROLLOUT_MODES.APPLY_FOR_EVERYONE)
    .trim()
    .toUpperCase();

  if (!["STANDARD", "PREMIUM", "ELITE"].includes(name)) {
    throw createHttpError(400, "Invalid package name");
  }
  if (!Object.values(PACKAGE_ROLLOUT_MODES).includes(rolloutMode)) {
    throw createHttpError(
      400,
      "rolloutMode must be APPLY_FOR_EVERYONE or APPLY_AFTER_EXHAUSTION",
    );
  }

  const nextJobLimit = Number(req.body.jobLimit);
  if (!Number.isFinite(nextJobLimit) || nextJobLimit <= 0) {
    throw createHttpError(400, "jobLimit must be a positive number");
  }

  const previousPackage = await Package.findOne({ name }).select("jobLimit");

  const updatedPackage = await Package.findOneAndUpdate(
    { name },
    {
      name,
      jobLimit: nextJobLimit,
      description: req.body.description?.trim() || "",
    },
    { returnDocument: "after", upsert: true, runValidators: true },
  );

  const impactedCompanies = await Company.find({ packageType: name });
  await Promise.all(
    impactedCompanies.map((company) => {
      const previousLimit = Number(
        company.jobLimit || previousPackage?.jobLimit || updatedPackage.jobLimit || 0,
      );
      const activeJobCount = Number(company.activeJobCount || 0);
      const shouldApplyImmediately =
        rolloutMode === PACKAGE_ROLLOUT_MODES.APPLY_FOR_EVERYONE ||
        activeJobCount >= previousLimit;

      company.jobLimit = shouldApplyImmediately ? updatedPackage.jobLimit : previousLimit;
      company.grandfatheredJobLimit = shouldApplyImmediately ? 0 : previousLimit;
      return company.save();
    }),
  );

  res.status(200).json({
    success: true,
    message:
      rolloutMode === PACKAGE_ROLLOUT_MODES.APPLY_FOR_EVERYONE
        ? "Package updated and applied for all existing clients."
        : "Package updated. Existing clients stay on current limits until their slots are exhausted.",
    data: {
      id: String(updatedPackage._id),
      name: updatedPackage.name,
      jobLimit: updatedPackage.jobLimit,
      description: updatedPackage.description,
      rolloutMode,
    },
  });
});

exports.getQRCodes = asyncHandler(async (req, res) => {
  const qrCodes = await QRCode.find(getQrVisibilityFilter(req.user))
    .sort({ updatedAt: -1 })
    .populate("companyId", "name")
    .populate("jobId", "title");

  res.status(200).json({
    success: true,
    data: qrCodes.map(formatQRCodeRecord),
  });
});

exports.getQRCode = asyncHandler(async (req, res) => {
  const qrCode = await resolveQRCode(req.params.id);

  if (!qrCode) {
    throw createHttpError(404, "QR code not found");
  }

  assertOwnedByRequesterForFse(
    qrCode.createdByCRM,
    req.user,
    "You can only view QR codes created by you.",
  );

  if (!qrCode.companyId?._id) {
    throw createHttpError(404, "Company not found");
  }

  res.status(200).json({
    success: true,
    data: {
      ...formatQRCodeRecord(qrCode),
      company: formatQRCodeCompany(qrCode.companyId),
    },
  });
});

exports.updateQRCode = asyncHandler(async (req, res) => {
  const qrCode = await resolveQRCode(req.params.id);

  if (!qrCode) {
    throw createHttpError(404, "QR code not found");
  }

  assertOwnedByRequesterForFse(
    qrCode.createdByCRM,
    req.user,
    "You can only update QR codes created by you.",
  );

  const company =
    qrCode.companyId?._id ? qrCode.companyId : await Company.findById(qrCode.companyId);

  if (!company) {
    throw createHttpError(404, "Company not found");
  }

  const applyTrimmedString = (nextValue, fallbackValue) => {
    if (typeof nextValue !== "string") {
      return fallbackValue;
    }

    const trimmed = nextValue.trim();
    return trimmed ? trimmed : fallbackValue;
  };

  const incomingCompany = req.body.company || {};
  const incomingContact = incomingCompany.contact || {};
  const incomingLocation = incomingCompany.location || {};

  company.name = applyTrimmedString(incomingCompany.name, company.name);
  company.tagline = applyTrimmedString(incomingCompany.tagline, company.tagline || "");
  company.industry = applyTrimmedString(incomingCompany.industry, company.industry || "");
  company.website = applyTrimmedString(incomingCompany.website, company.website || "");
  company.linkedIn = applyTrimmedString(incomingCompany.linkedIn, company.linkedIn || "");

  const updatedEmail = applyTrimmedString(incomingContact.email, company.email);
  company.email = updatedEmail ? updatedEmail.toLowerCase() : company.email;
  company.phone = applyTrimmedString(incomingContact.phone, company.phone || "");
  company.altPhone = applyTrimmedString(incomingContact.altPhone, company.altPhone || "");

  company.location = {
    ...(company.location || {}),
    region: applyTrimmedString(incomingLocation.region, company.location?.region || ""),
    city: applyTrimmedString(incomingLocation.city, company.location?.city || ""),
    zone: applyTrimmedString(incomingLocation.zone, company.location?.zone || ""),
    address: applyTrimmedString(incomingLocation.address, company.location?.address || ""),
    pincode: applyTrimmedString(incomingLocation.pincode, company.location?.pincode || ""),
  };

  company.about = applyTrimmedString(req.body.about, company.about || "");
  company.mission = applyTrimmedString(req.body.mission, company.mission || "");
  company.vision = applyTrimmedString(req.body.vision, company.vision || "");

  if (Array.isArray(req.body.whyJoinUs)) {
    company.whyJoinUs = req.body.whyJoinUs
      .map((item) => ({
        icon: applyTrimmedString(item?.icon, ""),
        title: applyTrimmedString(item?.title, ""),
        desc: applyTrimmedString(item?.desc, ""),
      }))
      .filter((item) => item.title || item.desc || item.icon);
  }

  await company.save();

  const companyId = company._id;
  const jobId = qrCode.jobId?._id || qrCode.jobId || null;

  const jobs = jobId
    ? await Job.find({
        _id: jobId,
        companyId,
        isActive: true,
        approvalStatus: "APPROVED",
      })
    : await Job.find({
        companyId,
        isActive: true,
        approvalStatus: "APPROVED",
      });

  const pdfBuffer = await generateCompanyQRPDF({
    company,
    jobs,
    qrImageUrl: qrCode.qrImageUrl,
  });

  const uploadedPdf = await uploadPdfBuffer(pdfBuffer, {
    token: qrCode.token,
    publicId: qrCode.pdfPublicId || undefined,
  });

  qrCode.pdfUrl = uploadedPdf.secure_url;
  qrCode.pdfPublicId = uploadedPdf.public_id;
  await qrCode.save();

  const hydratedQr = await QRCode.findById(qrCode._id)
    .populate("companyId", "name")
    .populate("jobId", "title");

  res.status(200).json({
    success: true,
    data: {
      ...formatQRCodeRecord(hydratedQr),
      company: formatQRCodeCompany(company),
    },
  });
});

exports.createQRCode = asyncHandler(async (req, res) => {
  const { companyId = "", jobId = "" } = req.body;

  if (!companyId) {
    throw createHttpError(400, "Company is required");
  }

  if (isFseOperator(req.user)) {
    const company = await Company.findById(companyId).select("createdByCRM");
    if (!company) {
      throw createHttpError(404, "Company not found");
    }

    assertOwnedByRequesterForFse(
      company.createdByCRM,
      req.user,
      "You can only generate QR codes for client accounts created by you.",
    );
  }

  const hydratedQr = await createQrKitForCompany({
    companyId,
    jobId: jobId || null,
    createdByCRM: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: formatQRCodeRecord(hydratedQr),
  });
});

exports.shareQRCode = asyncHandler(async (req, res) => {
  const qrCode = await resolveQRCode(req.params.id);

  if (!qrCode) {
    throw createHttpError(404, "QR code not found");
  }

  assertOwnedByRequesterForFse(
    qrCode.createdByCRM,
    req.user,
    "You can only share QR records created by you.",
  );

  qrCode.shareChannel = (req.body.channel || "MANUAL").toUpperCase();
  qrCode.sharedWithEmail = req.body.email?.trim().toLowerCase() || "";
  qrCode.lastSharedAt = new Date();
  await qrCode.save();

  res.status(200).json({
    success: true,
    data: formatQRCodeRecord(qrCode),
  });
});

exports.getCandidates = asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const statusFilter = String(req.query.status || "ALL").trim().toUpperCase();
  const allowedStatuses = ["ALL", "ACTIVE", "PENDING_INVITE", "RESTRICTED"];

  if (!allowedStatuses.includes(statusFilter)) {
    throw createHttpError(400, `status must be one of ${allowedStatuses.join(", ")}`);
  }

  const candidateQuery = {
    role: "CANDIDATE",
  };

  if (statusFilter === "ACTIVE") {
    candidateQuery.isActive = true;
    candidateQuery.accessStatus = "ACTIVE";
  } else if (statusFilter === "PENDING_INVITE") {
    candidateQuery.accessStatus = "PENDING_INVITE";
  } else if (statusFilter === "RESTRICTED") {
    candidateQuery.$or = [{ accessStatus: "RESTRICTED" }, { isActive: false }];
  }

  if (search) {
    const regex = { $regex: escapeRegExp(search), $options: "i" };
    const searchClause = {
      $or: [{ name: regex }, { email: regex }],
    };

    if (candidateQuery.$or) {
      candidateQuery.$and = [searchClause, { $or: candidateQuery.$or }];
      delete candidateQuery.$or;
    } else {
      Object.assign(candidateQuery, searchClause);
    }
  }

  const [candidateUsers, allCandidateUsers, candidateProfiles, networkCoverageResult] = await Promise.all([
    User.find(candidateQuery)
      .select("_id name email accessStatus isActive createdAt updatedAt")
      .sort({ updatedAt: -1, createdAt: -1 }),
    User.find({ role: "CANDIDATE" }).select("_id accessStatus isActive"),
    CandidateProfile.find({})
      .select("userId phone altPhone currentTitle currentCompany totalExperience currentCity currentState currentCountry skills resume updatedAt"),
    CandidateProfile.aggregate([
      {
        $match: {
          "resume.storageProvider": { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$resume.storageProvider",
        },
      },
      {
        $count: "total",
      },
    ]),
  ]);

  const candidateIds = candidateUsers.map((user) => user._id);
  const applicationSummaries = candidateIds.length
    ? await Application.aggregate([
        {
          $match: {
            candidateId: { $in: candidateIds },
          },
        },
        {
          $group: {
            _id: "$candidateId",
            totalApplications: { $sum: 1 },
            lastAppliedAt: { $max: "$updatedAt" },
          },
        },
      ])
    : [];

  const profileMap = new Map(
    candidateProfiles.map((profile) => [String(profile.userId), profile]),
  );
  const applicationMap = new Map(
    applicationSummaries.map((item) => [String(item._id), item]),
  );

  const totalCandidates = allCandidateUsers.length;
  const verifiedAccess = allCandidateUsers.filter(
    (item) => item.isActive && item.accessStatus === "ACTIVE",
  ).length;
  const pendingInvite = allCandidateUsers.filter(
    (item) => item.accessStatus === "PENDING_INVITE",
  ).length;
  const restrictedProfiles = allCandidateUsers.filter(
    (item) => item.accessStatus === "RESTRICTED" || !item.isActive,
  ).length;
  const networkCoverageChannels = Number(networkCoverageResult[0]?.total || 0);

  const items = candidateUsers.map((candidateUser) =>
    formatCandidateRecord({
      candidateUser,
      candidateProfile: profileMap.get(String(candidateUser._id)),
      applicationSummary: applicationMap.get(String(candidateUser._id)),
    }),
  );

  res.status(200).json({
    success: true,
    data: {
      summary: {
        candidateProfiles: candidateProfiles.length,
        verifiedAccess,
        pendingInvite,
      },
      focusAreas: {
        activeTalentPool: verifiedAccess,
        networkCoverageChannels,
        restrictedProfiles,
      },
      totalCandidates,
      filteredCount: items.length,
      items,
    },
  });
});

exports.getApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find()
    .sort({ updatedAt: -1 })
    .populate("companyId", "name")
    .populate("jobId", "title");
  const candidateIds = [...new Set(applications.map((item) => String(item.candidateId)))].filter(
    Boolean,
  );
  const [candidateUsers, candidateProfiles] = await Promise.all([
    User.find({ _id: { $in: candidateIds } }).select("name email"),
    CandidateProfile.find({ userId: { $in: candidateIds } }).select(
      "userId phone altPhone currentTitle headline summary totalExperience currentCompany currentCity currentState currentCountry skills resume",
    ),
  ]);
  const candidateMap = new Map(candidateUsers.map((user) => [String(user._id), user]));
  const candidateProfileMap = new Map(
    candidateProfiles.map((profile) => [String(profile.userId), profile]),
  );

  res.status(200).json({
    success: true,
    data: applications.map((application) =>
      formatApplication(
        application,
        candidateMap.get(String(application.candidateId)),
        candidateProfileMap.get(String(application.candidateId)),
      ),
    ),
  });
});

exports.getCandidateProfile = asyncHandler(async (req, res) => {
  const candidateId = req.params.candidateId;

  const [candidateUser, candidateProfile] = await Promise.all([
    User.findById(candidateId).select("name email"),
    CandidateProfile.findOne({ userId: candidateId }).select(
      "userId phone altPhone currentTitle headline summary totalExperience currentCompany currentCity currentState currentCountry skills resume",
    ),
  ]);

  if (!candidateUser) {
    throw createHttpError(404, "Candidate not found");
  }

  res.status(200).json({
    success: true,
    data: {
      candidateName: candidateUser.name || "",
      candidateEmail: candidateUser.email || "",
      candidatePhone: candidateProfile?.phone || "",
      candidateAltPhone: candidateProfile?.altPhone || "",
      candidateDesignation: candidateProfile?.currentTitle || "",
      candidateHeadline: candidateProfile?.headline || "",
      candidateSummary: candidateProfile?.summary || "",
      candidateExperience: candidateProfile?.totalExperience || "",
      candidateCurrentCompany: candidateProfile?.currentCompany || "",
      candidateCity: candidateProfile?.currentCity || "",
      candidateState: candidateProfile?.currentState || "",
      candidateCountry: candidateProfile?.currentCountry || "",
      candidateSkills: Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : [],
      resumeUrl: candidateProfile?.resume?.url || "",
      resumeFileName: candidateProfile?.resume?.fileName || "",
      resumeStorageProvider: candidateProfile?.resume?.storageProvider || "",
      resumeUploadedAt: candidateProfile?.resume?.uploadedAt || null,
    },
  });
});

exports.updateCandidate = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  const {
    name,
    email,
    phone,
    designation,
    currentCompany,
    totalExperience,
    city,
    state,
    country,
  } = req.body;

  const candidateUser = await User.findById(candidateId);
  if (!candidateUser) {
    throw createHttpError(404, "Candidate user record not found.");
  }

  if (name !== undefined) candidateUser.name = String(name || "").trim();
  if (email !== undefined) candidateUser.email = String(email || "").trim().toLowerCase();
  await candidateUser.save();

  let candidateProfile = await CandidateProfile.findOne({ userId: candidateId });
  if (!candidateProfile) {
    candidateProfile = new CandidateProfile({ userId: candidateId });
  }

  if (phone !== undefined) candidateProfile.phone = String(phone || "").trim();
  if (designation !== undefined) candidateProfile.currentTitle = String(designation || "").trim();
  if (currentCompany !== undefined)
    candidateProfile.currentCompany = String(currentCompany || "").trim();
  if (totalExperience !== undefined)
    candidateProfile.totalExperience = String(totalExperience || "").trim();
  if (city !== undefined) candidateProfile.currentCity = String(city || "").trim();
  if (state !== undefined) candidateProfile.currentState = String(state || "").trim();
  if (country !== undefined) candidateProfile.currentCountry = String(country || "").trim();

  await candidateProfile.save();

  res.status(200).json({
    success: true,
    data: formatCandidateRecord({
      candidateUser,
      candidateProfile,
    }),
  });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate("companyId", "name")
    .populate("jobId", "title");

  if (!application) {
    throw createHttpError(404, "Application not found");
  }

  application.status = (req.body.status || application.status).toUpperCase();
  await application.save();

  const [candidateUser, candidateProfile] = await Promise.all([
    User.findById(application.candidateId).select("name email"),
    CandidateProfile.findOne({ userId: application.candidateId }).select(
      "userId phone altPhone currentTitle headline summary totalExperience currentCompany currentCity currentState currentCountry skills resume",
    ),
  ]);

  if (candidateUser) {
    await CandidateNotification.create({
      candidateId: candidateUser._id,
      companyId: application.companyId?._id || application.companyId,
      jobId: application.jobId?._id || application.jobId,
      applicationId: application._id,
      title: "Application status updated",
      message: `${application.jobId?.title || "Your application"} is now marked as ${application.status}.`,
      category: "APPLICATION",
      actionUrl: "/candidate/applications",
    });

    const newStatus = application.status;
    const jobTitle = application.jobId?.title || "the role";
    const companyName = application.companyId?.name || "The company";
    const basePayload = {
      email: candidateUser.email,
      fullName: candidateUser.name,
      jobTitle,
      companyName,
    };

    switch (newStatus) {
      case "SHORTLISTED":
        EventBus.emit(EVENTS.CANDIDATE_SHORTLISTED, basePayload);
        break;
      case "REJECTED":
        EventBus.emit(EVENTS.CANDIDATE_REJECTED, basePayload);
        break;
      case "INTERVIEW":
        EventBus.emit(EVENTS.CANDIDATE_INTERVIEW_SCHEDULED, {
          ...basePayload,
          interviewDate: "",
          interviewTime: "",
          interviewMode: "",
          interviewLink: "",
        });
        break;
      case "OFFERED":
        EventBus.emit(EVENTS.CANDIDATE_OFFER_ISSUED, {
          ...basePayload,
          offerLink: "",
        });
        break;
    }
  }

  res.status(200).json({
    success: true,
    data: formatApplication(application, candidateUser, candidateProfile),
  });
});

exports.getNotifications = asyncHandler(async (req, res) => {
  const campaigns = await CrmCampaign.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: campaigns.map((campaign) => ({
      id: String(campaign._id),
      title: campaign.title,
      message: campaign.message,
      audience: campaign.audience,
      channel: campaign.channel,
      status: campaign.status,
      sentCount: campaign.sentCount,
      createdAt: campaign.createdAt,
      lastUpdated: formatRelativeTime(campaign.updatedAt),
    })),
  });
});

exports.createNotification = asyncHandler(async (req, res) => {
  const audience = (req.body.audience || "").toUpperCase();
  const channel = (req.body.channel || "").toUpperCase();

  if (!["CLIENTS", "CANDIDATES"].includes(audience) || !["EMAIL", "APP"].includes(channel)) {
    throw createHttpError(400, "Invalid audience or channel");
  }

  const sentCount =
    audience === "CLIENTS"
      ? await Company.countDocuments()
      : await User.countDocuments({ role: "CANDIDATE" });

  const campaign = await CrmCampaign.create({
    title: req.body.title?.trim() || "CRM Campaign",
    message: req.body.message?.trim() || "",
    audience,
    channel,
    companyIds: req.body.companyIds || [],
    jobIds: req.body.jobIds || [],
    status: "SENT",
    sentCount,
    createdByCRM: req.user._id,
  });

  if (audience === "CANDIDATES") {
    const candidates = await User.find({ role: "CANDIDATE", isActive: true }).select("_id");

    if (candidates.length) {
      await CandidateNotification.insertMany(
        candidates.map((candidate) => ({
          candidateId: candidate._id,
          title: campaign.title,
          message: campaign.message,
          category: "CAMPAIGN",
          actionUrl: "/candidate/notifications",
          metadata: {
            channel: campaign.channel,
            campaignId: String(campaign._id),
          },
        })),
      );
    }
  }

  res.status(201).json({
    success: true,
    data: {
      id: String(campaign._id),
      title: campaign.title,
      message: campaign.message,
      audience: campaign.audience,
      channel: campaign.channel,
      status: campaign.status,
      sentCount: campaign.sentCount,
      createdAt: campaign.createdAt,
    },
  });
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const companies = await Company.find().select("location activeJobCount packageType");

  const aggregateByKey = (key) => {
    const groups = new Map();

    companies.forEach((company) => {
      const bucket = company.location?.[key] || "Unassigned";
      const current = groups.get(bucket) || { location: bucket, clients: 0, openRoles: 0 };
      current.clients += 1;
      current.openRoles += Number(company.activeJobCount || 0);
      groups.set(bucket, current);
    });

    return [...groups.values()].sort((left, right) => right.clients - left.clients);
  };

  res.status(200).json({
    success: true,
    data: {
      regions: aggregateByKey("region"),
      cities: aggregateByKey("city"),
      zones: aggregateByKey("zone"),
      packageMix: await Package.find().sort({ jobLimit: 1 }),
    },
  });
});

exports.getSettings = asyncHandler(async (req, res) => {
  const packages = await Package.find().sort({ jobLimit: 1 });

  res.status(200).json({
    success: true,
    data: {
      profile: formatCrmUser(req.user),
      packages: packages.map((pkg) => ({
        id: String(pkg._id),
        name: pkg.name,
        jobLimit: pkg.jobLimit,
        description: pkg.description,
      })),
      channels: ["EMAIL", "APP"],
    },
  });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  req.user.fullName = req.body.fullName?.trim() || req.user.fullName;
  req.user.phone = req.body.phone?.trim() || req.user.phone;
  req.user.department = req.body.department?.trim() ?? req.user.department;
  req.user.scope = req.body.scope?.trim() ?? req.user.scope;
  req.user.territory = req.body.territory?.trim() ?? req.user.territory;
  req.user.state = req.body.state?.trim() ?? req.user.state;
  await req.user.save();

  res.status(200).json({
    success: true,
    data: formatCrmUser(req.user),
  });
});

exports.downloadResume = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;

  const profile = await CandidateProfile.findOne({ userId: candidateId }).select("resume");

  if (!profile || !profile.resume?.url) {
    return res.status(404).json({ success: false, message: "Resume not found for this candidate" });
  }

  const resumeUrl = profile.resume.url;
  const fileName = profile.resume.fileName || "Resume.pdf";
  const safeFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

  try {
    const response = await axios({
      method: "get",
      url: resumeUrl,
      responseType: "stream",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);

    response.data.pipe(res);
  } catch (error) {
    console.error("Error proxying resume download:", error.message);
    res.status(500).json({ success: false, message: "Unable to download resume. Please try again later." });
  }
});
