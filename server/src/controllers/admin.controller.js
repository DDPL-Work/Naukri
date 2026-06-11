const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CrmUser = require("../models/CrmUser");
const Company = require("../models/Company");
const Job = require("../models/Job");
const Application = require("../models/Application");
const AdminRole = require("../models/AdminRole");
const AdminSetting = require("../models/AdminSetting");
const AdminAuditLog = require("../models/AdminAuditLog");
const asyncHandler = require("../middleware/async.middleware");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");
const {
  buildPermissionPreset,
  defaultAdminRoles,
  defaultAdminSettings,
  normalizeDisplayRole,
  normalizeAccessStatus,
  mapDisplayRoleToCrmRole,
  permissionActions,
  permissionDomains,
} = require("../services/admin.service");

const displayRoleOrder = ["ADMIN", "CRM", "FSE", "CLIENT", "CANDIDATE"];

const displayRoleMeta = {
  ADMIN: {
    label: "Admin",
    description: "Governance, user access, platform monitoring, and reporting.",
    status: "Full control",
  },
  CRM: {
    label: "CRM",
    description: "Client delivery teams managing accounts, jobs, and approvals.",
    status: "Operational",
  },
  FSE: {
    label: "FSE",
    description: "Field sales teams driving acquisition and regional growth.",
    status: "Distributed",
  },
  CLIENT: {
    label: "Client",
    description: "Client-side hiring teams reviewing jobs and applications.",
    status: "Self-service",
  },
  CANDIDATE: {
    label: "Candidate",
    description: "Applicants tracking roles, interviews, and submissions.",
    status: "Live traffic",
  },
};

const defaultAdminCredentials = {
  fullName: "Ashish Kathait",
  email: "ashishkathait@gmail.com",
  password: "Ashish003!",
  department: "Leadership",
  scope: "Global",
};


const crmRolesForOperationalUsers = ["LEAD_GENERATOR", "STATE_MANAGER", "ZONAL_MANAGER", "APPROVER"];

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const generateToken = (id, type) =>
  jwt.sign({ id, type }, process.env.JWT_SECRET, { expiresIn: "7d" });

const toSentenceCase = (value = "") =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeRoleInput = (role = "") => role.trim().toUpperCase();

const normalizeStatusInput = (status = "ACTIVE") => {
  const value = status.trim().toUpperCase().replace(/\s+/g, "_");

  if (["ACTIVE", "PENDING_INVITE", "RESTRICTED"].includes(value)) {
    return value;
  }

  return "ACTIVE";
};

const roleToSource = (role) =>
  ["ADMIN", "CRM", "FSE"].includes(role) ? "CRM" : "USER";

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
  if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatRuntime = () => {
  const uptime = Math.max(1, Math.floor(process.uptime()));
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatAdminUser = (doc, source) => {
  const role = normalizeDisplayRole(doc, source);
  const status = normalizeAccessStatus(doc);
  const baseScope = doc.scope || doc.territory || doc.state || "";

  return {
    id: String(doc._id),
    source,
    fullName: source === "USER" ? doc.name : doc.fullName,
    email: doc.email,
    role,
    roleLabel: toSentenceCase(role),
    department: doc.department || "",
    scope: baseScope,
    status,
    statusLabel: toSentenceCase(status),
    lastActive: formatRelativeTime(doc.updatedAt || doc.createdAt),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const sanitizePermissionMatrix = (permissions = {}) =>
  Object.fromEntries(
    permissionDomains.map((domain) => [
      domain,
      Object.fromEntries(
        permissionActions.map((action) => [
          action,
          Boolean(permissions?.[domain]?.[action]),
        ]),
      ),
    ]),
  );

const buildRoleResponse = (role) => ({
  id: String(role._id),
  name: role.name,
  code: role.code,
  scope: role.scope,
  description: role.description,
  isSystemRole: role.isSystemRole,
  systemRoleKey: role.systemRoleKey,
  permissions: sanitizePermissionMatrix(role.permissions),
  members: (role.members || []).map((member) => ({
    source: member.source,
    userId: String(member.userId),
    name: member.name,
    email: member.email,
    assignedAt: member.assignedAt,
  })),
});

const extractCommonUserData = (doc, source) => ({
  fullName: source === "USER" ? doc.name : doc.fullName,
  email: doc.email,
  role: normalizeDisplayRole(doc, source),
  department: doc.department || "",
  scope: doc.scope || doc.territory || doc.state || "",
  status: normalizeAccessStatus(doc),
  passwordHash: doc.password,
});

const getModelForSource = (source) => (source === "CRM" ? CrmUser : User);

const ensureUniqueEmail = async (email, excluded = null) => {
  const normalizedEmail = email.trim().toLowerCase();
  const [existingUser, existingCrmUser] = await Promise.all([
    User.findOne({ email: normalizedEmail }).select("_id"),
    CrmUser.findOne({ email: normalizedEmail }).select("_id"),
  ]);

  const conflicts = [
    { source: "USER", doc: existingUser },
    { source: "CRM", doc: existingCrmUser },
  ].filter(({ doc }) => doc);

  const conflict = conflicts.find(({ source, doc }) => {
    if (!excluded) {
      return true;
    }

    return !(source === excluded.source && String(doc._id) === String(excluded.id));
  });

  if (conflict) {
    throw createHttpError(409, "Email already exists");
  }

  return normalizedEmail;
};

const saveUserRecord = async ({
  existingDoc = null,
  existingSource = null,
  targetRole,
  payload,
}) => {
  const source = roleToSource(targetRole);
  const normalizedEmail = await ensureUniqueEmail(
    payload.email,
    existingDoc
      ? {
          source: existingSource,
          id: existingDoc._id,
        }
      : null,
  );

  const baseData = existingDoc
    ? extractCommonUserData(existingDoc, existingSource)
    : {
        fullName: "",
        email: normalizedEmail,
        role: targetRole,
        department: "",
        scope: "",
        status: "ACTIVE",
        passwordHash: "",
      };

  const fullName = (payload.fullName || baseData.fullName).trim();
  const department = (payload.department ?? baseData.department).trim();
  const scope = (payload.scope ?? baseData.scope).trim();
  const status = normalizeStatusInput(payload.status || baseData.status);
  const plainPassword = payload.password?.trim();
  const passwordHash = plainPassword
    ? await bcrypt.hash(plainPassword, 10)
    : baseData.passwordHash;

  if (!fullName) {
    throw createHttpError(400, "Full name is required");
  }

  if (!passwordHash) {
    throw createHttpError(400, "Password is required");
  }

  const commonPayload = {
    email: normalizedEmail,
    department,
    scope,
    accessStatus: status,
    isActive: status !== "RESTRICTED",
  };

  if (source === "USER") {
    const writePayload = {
      ...commonPayload,
      name: fullName,
      password: passwordHash,
      role: targetRole,
    };

    if (existingDoc && existingSource === "USER") {
      return {
        source,
        doc: await User.findByIdAndUpdate(existingDoc._id, writePayload, {
          returnDocument: "after",
          runValidators: true,
        }),
      };
    }

    const created = await User.create(writePayload);

    if (existingDoc) {
      await getModelForSource(existingSource).findByIdAndDelete(existingDoc._id);
    }

    return {
      source,
      doc: created,
    };
  }

  const crmRole = mapDisplayRoleToCrmRole(targetRole);
  const writePayload = {
    ...commonPayload,
    fullName,
    password: passwordHash,
    role: crmRole,
    territory: scope,
    state: department,
  };

  if (existingDoc && existingSource === "CRM") {
    return {
      source,
      doc: await CrmUser.findByIdAndUpdate(existingDoc._id, writePayload, {
        returnDocument: "after",
        runValidators: true,
      }),
    };
  }

  const created = await CrmUser.create(writePayload);

  if (existingDoc) {
    await getModelForSource(existingSource).findByIdAndDelete(existingDoc._id);
  }

  return {
    source,
    doc: created,
  };
};

const appendAuditLog = async ({
  action,
  entityType,
  entityId = "",
  message,
  severity = "INFO",
  metadata = {},
  performedBy,
}) => {
  await AdminAuditLog.create({
    action,
    entityType,
    entityId,
    message,
    severity,
    metadata,
    performedBy: {
      id: String(performedBy?._id || ""),
      email: performedBy?.email || "",
      role: performedBy?.role || "",
    },
  });
};

const ensureDefaultAdminAccount = async () => {
  const normalizedEmail = defaultAdminCredentials.email.toLowerCase();
  const passwordHash = await bcrypt.hash(defaultAdminCredentials.password, 10);
  const [existingCrmAdmin, existingUserAdmin] = await Promise.all([
    CrmUser.findOne({ email: normalizedEmail }),
    User.findOne({ email: normalizedEmail }),
  ]);

  if (existingCrmAdmin) {
    existingCrmAdmin.fullName =
      existingCrmAdmin.fullName || defaultAdminCredentials.fullName;
    existingCrmAdmin.password = passwordHash;
    existingCrmAdmin.role = "ADMIN";
    existingCrmAdmin.department =
      existingCrmAdmin.department || defaultAdminCredentials.department;
    existingCrmAdmin.scope = existingCrmAdmin.scope || defaultAdminCredentials.scope;
    existingCrmAdmin.territory =
      existingCrmAdmin.territory || defaultAdminCredentials.scope;
    existingCrmAdmin.state =
      existingCrmAdmin.state || defaultAdminCredentials.department;
    existingCrmAdmin.accessStatus = "ACTIVE";
    existingCrmAdmin.isActive = true;
    await existingCrmAdmin.save();
    return;
  }

  if (existingUserAdmin) {
    existingUserAdmin.name = existingUserAdmin.name || defaultAdminCredentials.fullName;
    existingUserAdmin.password = passwordHash;
    existingUserAdmin.role = "ADMIN";
    existingUserAdmin.department =
      existingUserAdmin.department || defaultAdminCredentials.department;
    existingUserAdmin.scope = existingUserAdmin.scope || defaultAdminCredentials.scope;
    existingUserAdmin.accessStatus = "ACTIVE";
    existingUserAdmin.isActive = true;
    await existingUserAdmin.save();
    return;
  }

  await CrmUser.create({
    fullName: defaultAdminCredentials.fullName,
    email: normalizedEmail,
    password: passwordHash,
    role: "ADMIN",
    department: defaultAdminCredentials.department,
    scope: defaultAdminCredentials.scope,
    territory: defaultAdminCredentials.scope,
    state: defaultAdminCredentials.department,
    accessStatus: "ACTIVE",
    isActive: true,
  });
};

const ensureAdminSetup = async () => {
  await Promise.all(
    defaultAdminRoles.map((role) =>
      AdminRole.findOneAndUpdate(
        { code: role.code },
        {
          $setOnInsert: role,
        },
          {
            upsert: true,
            returnDocument: "after",
            setDefaultsOnInsert: true,
          },
      ),
    ),
  );

  await Promise.all(
    defaultAdminSettings.map((setting) =>
      AdminSetting.findOneAndUpdate(
        { module: setting.module },
        {
          $setOnInsert: setting,
        },
          {
            upsert: true,
            returnDocument: "after",
            setDefaultsOnInsert: true,
          },
      ),
    ),
  );

  await ensureDefaultAdminAccount();
};

const syncSystemRoleMembers = async () => {
  const [roles, users, crmUsers] = await Promise.all([
    AdminRole.find({ isSystemRole: true }),
    User.find({ role: { $in: ["CLIENT", "CANDIDATE"] } }).select("name email role createdAt"),
    CrmUser.find({
      role: { $in: ["ADMIN", "FSE", ...crmRolesForOperationalUsers] },
    }).select("fullName email role createdAt"),
  ]);

  const grouped = {
    ADMIN: crmUsers.filter((user) => user.role === "ADMIN").map((user) => ({
      source: "CRM",
      userId: user._id,
      name: user.fullName,
      email: user.email,
      assignedAt: user.createdAt || new Date(),
    })),
    CRM: crmUsers
      .filter((user) => crmRolesForOperationalUsers.includes(user.role))
      .map((user) => ({
        source: "CRM",
        userId: user._id,
        name: user.fullName,
        email: user.email,
        assignedAt: user.createdAt || new Date(),
      })),
    FSE: crmUsers.filter((user) => user.role === "FSE").map((user) => ({
      source: "CRM",
      userId: user._id,
      name: user.fullName,
      email: user.email,
      assignedAt: user.createdAt || new Date(),
    })),
    CLIENT: users.filter((user) => user.role === "CLIENT").map((user) => ({
      source: "USER",
      userId: user._id,
      name: user.name,
      email: user.email,
      assignedAt: user.createdAt || new Date(),
    })),
    CANDIDATE: users.filter((user) => user.role === "CANDIDATE").map((user) => ({
      source: "USER",
      userId: user._id,
      name: user.name,
      email: user.email,
      assignedAt: user.createdAt || new Date(),
    })),
  };

  await Promise.all(
    roles.map(async (role) => {
      const nextMembers = grouped[role.systemRoleKey] || [];
      const existingByKey = new Map(
        (role.members || []).map((member) => [
          `${member.source}:${String(member.userId)}`,
          member,
        ]),
      );

      role.members = nextMembers.map((member) => {
        const existing = existingByKey.get(
          `${member.source}:${String(member.userId)}`,
        );

        return existing || member;
      });

      await role.save();
    }),
  );
};

const fetchAdminUsers = async () => {
  const [users, crmUsers] = await Promise.all([
    User.find().select("name email role department scope accessStatus isActive createdAt updatedAt"),
    CrmUser.find().select(
      "fullName email role department scope territory state accessStatus isActive createdAt updatedAt",
    ),
  ]);

  return [
    ...crmUsers.map((doc) => formatAdminUser(doc, "CRM")),
    ...users.map((doc) => formatAdminUser(doc, "USER")),
  ].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
};

const fetchSectionSnapshot = async () => {
  await ensureAdminSetup();
  await syncSystemRoleMembers();

  const [
    users,
    roles,
    settings,
    companies,
    jobs,
    applications,
    auditLogs,
    candidateUsers,
  ] = await Promise.all([
    fetchAdminUsers(),
    AdminRole.find().sort({ isSystemRole: -1, name: 1 }),
    AdminSetting.find().sort({ module: 1 }),
    Company.find().sort({ createdAt: -1 }).limit(12).populate("createdByCRM", "fullName email"),
    Job.find().sort({ createdAt: -1 }).limit(12).populate("companyId", "name industry status"),
    Application.find()
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("jobId", "title")
      .populate("companyId", "name")
      .populate("candidateId", "name email"),
    AdminAuditLog.find().sort({ createdAt: -1 }).limit(12),
    User.find({ role: "CANDIDATE" }).sort({ createdAt: -1 }).limit(12),
  ]);

  return {
    users,
    roles,
    settings,
    companies,
    jobs,
    applications,
    auditLogs,
    candidateUsers,
  };
};

const buildSectionData = async (sectionKey) => {
  const snapshot = await fetchSectionSnapshot();
  const { users, roles, settings, companies, jobs, applications, auditLogs, candidateUsers } =
    snapshot;

  if (sectionKey === "companies") {
    const [totalCompanies, totalActiveCompanies, totalHiringCompanies] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: "ACTIVE" }),
      Company.countDocuments({ activelyHiring: true }),
    ]);
    const crmOwners = new Set(
      companies
        .map((company) => company.createdByCRM?._id && String(company.createdByCRM._id))
        .filter(Boolean),
    ).size;

    return {
      metrics: [
        { label: "Total companies", value: String(totalCompanies) },
        { label: "Active companies", value: String(totalActiveCompanies) },
        { label: "Hiring accounts", value: String(totalHiringCompanies) },
      ],
      cards: [
        {
          title: "Enterprise coverage",
          value: `${companies.filter((company) => Number(company.openRoles || 0) >= 5).length} priority accounts`,
          note: "Accounts with stronger hiring demand and deeper pipeline needs.",
        },
        {
          title: "CRM ownership",
          value: `${crmOwners} CRM owners`,
          note: "Distinct CRM operators attached to client companies.",
        },
        {
          title: "Open roles footprint",
          value: `${companies.reduce((total, company) => total + Number(company.openRoles || company.activeJobCount || 0), 0)} positions`,
          note: "Live role count reported across the visible company base.",
        },
      ],
      tableColumns: ["Company", "Industry", "Open Roles", "Status"],
      tableRows: companies.map((company) => [
        company.name,
        company.industry || "General",
        String(company.openRoles || company.activeJobCount || 0),
        company.status,
      ]),
    };
  }

  if (sectionKey === "jobs") {
    const [totalJobs, totalLiveJobs, totalExpiringJobs] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ isActive: true }),
      Job.countDocuments({
        deadline: {
          $lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
      }),
    ]);
    return {
      metrics: [
        { label: "Total postings", value: String(totalJobs) },
        { label: "Live jobs", value: String(totalLiveJobs) },
        { label: "Expiring soon", value: String(totalExpiringJobs) },
      ],
      cards: [
        {
          title: "Hiring concentration",
          value: `${new Set(jobs.map((job) => String(job.companyId?._id || ""))).size} companies`,
          note: "Distinct companies with jobs in the current Admin visibility set.",
        },
        {
          title: "Remote-ready roles",
          value: `${jobs.filter((job) => job.workplaceType?.toLowerCase().includes("remote")).length} jobs`,
          note: "Roles configured for remote or hybrid delivery.",
        },
        {
          title: "Approval pressure",
          value: `${jobs.filter((job) => !job.isActive).length} inactive roles`,
          note: "Roles currently paused, archived, or awaiting reactivation.",
        },
      ],
      tableColumns: ["Job", "Company", "Department", "Status"],
      tableRows: jobs.map((job) => [
        job.title,
        job.companyId?.name || "Unassigned company",
        job.department || "General",
        job.isActive ? "ACTIVE" : "INACTIVE",
      ]),
    };
  }

  if (sectionKey === "candidates") {
    const [totalCandidates, totalVerifiedCandidates, totalPendingCandidates] = await Promise.all([
      User.countDocuments({ role: "CANDIDATE" }),
      User.countDocuments({
        role: "CANDIDATE",
        isActive: true,
        accessStatus: { $ne: "RESTRICTED" },
      }),
      User.countDocuments({
        role: "CANDIDATE",
        accessStatus: "PENDING_INVITE",
      }),
    ]);
    const verifiedCandidates = candidateUsers.filter(
      (candidate) => candidate.isActive && candidate.accessStatus !== "RESTRICTED",
    );

    return {
      metrics: [
        { label: "Candidate profiles", value: String(totalCandidates) },
        { label: "Verified access", value: String(totalVerifiedCandidates) },
        { label: "Pending invite", value: String(totalPendingCandidates) },
      ],
      cards: [
        {
          title: "Active talent pool",
          value: `${verifiedCandidates.length} accessible profiles`,
          note: "Candidates currently active and visible for recruitment workflows.",
        },
        {
          title: "Network coverage",
          value: `${new Set(candidateUsers.map((candidate) => candidate.scope || "Open Network")).size} channels`,
          note: "Scope labels currently assigned to candidate access records.",
        },
        {
          title: "Restricted profiles",
          value: `${candidateUsers.filter((candidate) => candidate.accessStatus === "RESTRICTED").length} profiles`,
          note: "Accounts limited by Admin access control or policy action.",
        },
      ],
      tableColumns: ["Candidate", "Email", "Status", "Last Updated"],
      tableRows: candidateUsers.map((candidate) => [
        candidate.name,
        candidate.email,
        normalizeAccessStatus(candidate),
        formatRelativeTime(candidate.updatedAt || candidate.createdAt),
      ]),
    };
  }

  if (sectionKey === "applications") {
    const [totalApplications, totalShortlisted, totalHired] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: { $in: ["SHORTLISTED", "HIRED"] } }),
      Application.countDocuments({ status: "HIRED" }),
    ]);
    const shortlisted = applications.filter(
      (application) => application.status === "SHORTLISTED" || application.status === "HIRED",
    );

    return {
      metrics: [
        { label: "Total applications", value: String(totalApplications) },
        { label: "Shortlisted", value: String(totalShortlisted) },
        { label: "Hired", value: String(totalHired) },
      ],
      cards: [
        {
          title: "Application velocity",
          value: `${applications.length} recent records`,
          note: "Latest application records currently available to the Admin layer.",
        },
        {
          title: "Review pressure",
          value: `${applications.filter((application) => application.status === "APPLIED").length} in review`,
          note: "Applications awaiting shortlist, rejection, or hire movement.",
        },
        {
          title: "Conversion",
          value: `${applications.length ? Math.round((shortlisted.length / applications.length) * 100) : 0}%`,
          note: "Share of recent applications that moved beyond applied status.",
        },
      ],
      tableColumns: ["Job", "Company", "Candidate", "Status"],
      tableRows: applications.map((application) => [
        application.jobId?.title || "Unknown job",
        application.companyId?.name || "Unknown company",
        application.candidateId?.name || "Unknown candidate",
        application.status,
      ]),
    };
  }

  if (sectionKey === "monitoring") {
    const criticalLogs = auditLogs.filter(
      (log) => log.severity === "CRITICAL" || log.severity === "HIGH",
    );
    const restrictedUsers = users.filter((user) => user.status === "RESTRICTED");

    return {
      metrics: [
        { label: "Open alerts", value: String(criticalLogs.length) },
        { label: "Restricted accounts", value: String(restrictedUsers.length) },
        { label: "Runtime", value: formatRuntime() },
      ],
      cards: [
        {
          title: "Audit stream",
          value: `${auditLogs.length} recent events`,
          note: "Recent Admin-side activity and governance operations.",
        },
        {
          title: "Role integrity",
          value: `${roles.filter((role) => role.isSystemRole).length} system roles`,
          note: "Protected system roles currently monitored inside Admin.",
        },
        {
          title: "Policy surface",
          value: `${settings.length} live modules`,
          note: "Configured policy areas currently available for Admin governance.",
        },
      ],
      tableColumns: ["Action", "Entity", "Severity", "When"],
      tableRows: auditLogs.map((log) => [
        log.message,
        log.entityType,
        log.severity,
        formatRelativeTime(log.createdAt),
      ]),
    };
  }

  if (sectionKey === "reports") {
    const [totalActiveCompanies, totalLiveJobs, totalHiredOutcomes] = await Promise.all([
      Company.countDocuments({ status: "ACTIVE" }),
      Job.countDocuments({ isActive: true }),
      Application.countDocuments({ status: "HIRED" }),
    ]);
      // Define activeCompanies for tableRows
      const activeCompanies = totalActiveCompanies;
      // Define activeJobs for tableRows
      const activeJobs = totalLiveJobs;
    return {
      metrics: [
        { label: "Active clients", value: String(totalActiveCompanies) },
        { label: "Live jobs", value: String(totalLiveJobs) },
        { label: "Hired outcomes", value: String(totalHiredOutcomes) },
      ],
      cards: [
        {
          title: "Recruitment throughput",
          value: `${applications.length} tracked applications`,
          note: "Captured application flow available for operational reporting.",
        },
        {
          title: "Candidate yield",
          value: `${candidateUsers.length} visible candidates`,
          note: "Candidate-side volume available for funnel and performance review.",
        },
        {
          title: "Governance depth",
          value: `${auditLogs.length} recent audit events`,
          note: "Operational governance activity available for reporting context.",
        },
      ],
      tableColumns: ["Report Area", "Current Value", "Signal", "Source"],
      tableRows: [
        ["Client coverage", String(activeCompanies), "Healthy", "Companies"],
        ["Job volume", String(activeJobs), activeJobs > 0 ? "Live" : "Idle", "Jobs"],
        ["Candidate pool", String(candidateUsers.length), "Visible", "Users"],
        ["Application flow", String(applications.length), "Tracked", "Applications"],
      ],
    };
  }

  if (sectionKey === "settings") {
    const highRiskSettings = settings.filter((setting) => setting.risk === "High");

    return {
      metrics: [
        { label: "Config modules", value: String(settings.length) },
        { label: "High risk", value: String(highRiskSettings.length) },
        { label: "System roles", value: String(roles.filter((role) => role.isSystemRole).length) },
      ],
      cards: settings.slice(0, 3).map((setting) => ({
        title: setting.title,
        value: setting.currentState,
        note: setting.description || `${setting.module} configuration managed by ${setting.owner}.`,
      })),
      tableColumns: ["Module", "Owner", "Risk", "State"],
      tableRows: settings.map((setting) => [
        setting.module,
        setting.owner,
        setting.risk,
        setting.currentState,
      ]),
    };
  }

  throw createHttpError(404, "Unknown Admin section");
};

exports.login = asyncHandler(async (req, res) => {
  await ensureAdminSetup();

  const { email = "", password = "" } = req.body;

  if (!email.trim() || !password.trim()) {
    throw createHttpError(400, "Email and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [crmAdmin, userAdmin] = await Promise.all([
    CrmUser.findOne({ email: normalizedEmail }),
    User.findOne({ email: normalizedEmail }),
  ]);

  const account =
    crmAdmin?.role === "ADMIN"
      ? { doc: crmAdmin, source: "CRM" }
      : userAdmin?.role === "ADMIN"
        ? { doc: userAdmin, source: "USER" }
        : null;

  if (!account) {
    throw createHttpError(403, "Admin account not found");
  }

  const passwordMatches = await bcrypt.compare(password, account.doc.password);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (!account.doc.isActive || account.doc.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Admin account is inactive");
  }

  const profile = formatAdminUser(account.doc, account.source);

  const tokenPair = await issueTokenPair({
    user: account.doc,
    source: account.source,
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(200).json({
    success: true,
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      roleLabel: profile.roleLabel,
      source: profile.source,
    },
  });
});

exports.me = asyncHandler(async (req, res) => {
  const profile = formatAdminUser(req.user, req.adminSource);

  res.status(200).json({
    success: true,
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      roleLabel: profile.roleLabel,
      source: profile.source,
    },
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  await ensureAdminSetup();
  await syncSystemRoleMembers();

  const [
    companiesTotal,
    overLimitClients,
    liveJobsTotal,
    candidateTotal,
    applicationsTotal,
    allUsers,
    roles,
    settings,
    recentCompanies,
    recentJobs,
    recentApplications,
    auditLogs,
  ] = await Promise.all([
    Company.countDocuments(),
    Company.countDocuments({
      $expr: { $gt: ["$activeJobCount", "$jobLimit"] },
    }),
    Job.countDocuments(),
    User.countDocuments({ role: "CANDIDATE" }),
    Application.countDocuments(),
    fetchAdminUsers(),
    AdminRole.find().sort({ isSystemRole: -1, name: 1 }),
    AdminSetting.find().sort({ module: 1 }),
    Company.find().sort({ createdAt: -1 }).limit(5),
    Job.find().sort({ createdAt: -1 }).limit(5).populate("companyId", "name"),
    Application.find().sort({ createdAt: -1 }).limit(5).populate("companyId", "name").populate("jobId", "title"),
    AdminAuditLog.find().sort({ createdAt: -1 }).limit(6),
  ]);

  const roleCounts = displayRoleOrder.reduce((accumulator, role) => {
    accumulator[role] = allUsers.filter((user) => user.role === role).length;
    return accumulator;
  }, {});

  const oversightFeeds = recentCompanies.map((company) => ({
    company: company.name,
    jobs: Number(company.openRoles || company.activeJobCount || 0),
    candidates: recentApplications.filter(
      (application) => String(application.companyId?._id || "") === String(company._id),
    ).length,
    status: company.status === "ACTIVE" ? "Operational" : "Needs attention",
  }));

  const activeUsers = allUsers.filter((user) => user.status === "ACTIVE").length;
  const pendingInvites = allUsers.filter((user) => user.status === "PENDING_INVITE").length;
  const restrictedUsers = allUsers.filter((user) => user.status === "RESTRICTED").length;

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalClients: companiesTotal,
        overLimitClients,
        totalJobs: liveJobsTotal,
        totalCandidates: candidateTotal,
        totalApplications: applicationsTotal,
        activeUsers,
        pendingInvites,
        restrictedUsers,
        roleTemplates: roles.length,
        policyModules: settings.length,
      },
      roleViews: displayRoleOrder.map((role) => ({
        role,
        label: displayRoleMeta[role].label,
        status: displayRoleMeta[role].status,
        description: displayRoleMeta[role].description,
        activeUsers: roleCounts[role] || 0,
        coverage:
          role === "CLIENT"
            ? `${companiesTotal} company workspaces`
            : role === "CANDIDATE"
              ? "Live candidate network"
              : role === "FSE"
                ? `${Math.max(1, roleCounts.FSE)} active territories`
                : role === "CRM"
                  ? "North, West, Enterprise"
                  : "Global access",
      })),
      governanceCards: [
        {
          title: "System users",
          value: String(allUsers.length),
          note: `${pendingInvites} pending access actions`,
          iconKey: "users",
        },
        {
          title: "Role templates",
          value: String(roles.length),
          note: `${roles.filter((role) => !role.isSystemRole).length} custom role definitions`,
          iconKey: "shield",
        },
        {
          title: "Workflow policies",
          value: String(settings.length),
          note: `${settings.filter((setting) => setting.risk !== "Low").length} modules need watch`,
          iconKey: "settings",
        },
      ],
      oversightFeeds,
      platformSignals: [
        {
          label: "Admin access health",
          value: `${allUsers.length ? Math.round((activeUsers / allUsers.length) * 100) : 0}%`,
          progress: allUsers.length ? Math.round((activeUsers / allUsers.length) * 100) : 0,
          tone: "bg-emerald-500",
        },
        {
          label: "Role compliance",
          value: `${roles.filter((role) => role.members.length > 0).length}/${roles.length}`,
          progress: roles.length ? Math.round((roles.filter((role) => role.members.length > 0).length / roles.length) * 100) : 0,
          tone: "bg-blue-500",
        },
        {
          label: "System runtime",
          value: formatRuntime(),
          progress: 100,
          tone: "bg-lime-500",
        },
      ],
      dashboardHighlights: [
        {
          title: "Recent companies onboarded",
          value: String(recentCompanies.length),
          note: "Latest client records available in the Admin oversight window.",
          iconKey: "building",
        },
        {
          title: "Recent jobs created",
          value: String(recentJobs.length),
          note: "Latest hiring demand entering the recruitment platform.",
          iconKey: "briefcase",
        },
        {
          title: "Recent applications tracked",
          value: String(recentApplications.length),
          note: "Newest candidate movements across the system.",
          iconKey: "applications",
        },
      ],
      activityTimeline: auditLogs.map((log) => ({
        title: log.message,
        time: formatRelativeTime(log.createdAt),
        iconKey:
          log.entityType === "ROLE"
            ? "shield"
            : log.entityType === "USER"
              ? "users"
              : log.entityType === "SETTING"
                ? "settings"
                : "activity",
      })),
      reportingHighlights: [
        {
          title: "Applications processed",
          value: String(applicationsTotal),
          delta: `${recentApplications.length} recent records in view`,
        },
        {
          title: "Pending invites",
          value: String(pendingInvites),
          delta: `${restrictedUsers} restricted accounts under review`,
        },
        {
          title: "Client portfolio",
          value: String(companiesTotal),
          delta: `${candidateTotal} visible candidates across the platform`,
        },
      ],
      executiveSummary: {
        text:
          restrictedUsers > 0
            ? "Platform governance is stable with follow-up required on restricted account and policy review actions."
            : "Platform governance is healthy with Admin visibility active across users, roles, clients, jobs, and applications.",
        confidence: pendingInvites > restrictedUsers ? "Medium" : "High",
      },
    },
  });
});

exports.getSection = asyncHandler(async (req, res) => {
  const data = await buildSectionData(req.params.sectionKey);

  res.status(200).json({
    success: true,
    data,
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await fetchAdminUsers();

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        systemUsers: users.length,
        activeAccounts: users.filter((user) => user.status === "ACTIVE").length,
        pendingInvites: users.filter((user) => user.status === "PENDING_INVITE").length,
        protectedRoles: users.filter((user) => ["ADMIN", "CRM"].includes(user.role)).length,
      },
      users,
    },
  });
});

exports.createUser = asyncHandler(async (req, res) => {
  const targetRole = normalizeRoleInput(req.body.role);

  if (!displayRoleOrder.includes(targetRole)) {
    throw createHttpError(400, "Invalid role");
  }

  const result = await saveUserRecord({
    targetRole,
    payload: req.body,
  });

  await syncSystemRoleMembers();
  await appendAuditLog({
    action: "CREATE",
    entityType: "USER",
    entityId: String(result.doc._id),
    message: `Created ${toSentenceCase(targetRole)} user ${result.doc.email}`,
    severity: "INFO",
    metadata: { source: result.source, role: targetRole },
    performedBy: req.user,
  });

  res.status(201).json({
    success: true,
    data: formatAdminUser(result.doc, result.source),
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const source = req.params.source.toUpperCase();
  const id = req.params.id;
  const model = getModelForSource(source);
  const existingDoc = await model.findById(id);

  if (!existingDoc) {
    throw createHttpError(404, "User not found");
  }

  const targetRole = normalizeRoleInput(
    req.body.role || normalizeDisplayRole(existingDoc, source),
  );

  if (!displayRoleOrder.includes(targetRole)) {
    throw createHttpError(400, "Invalid role");
  }

  const result = await saveUserRecord({
    existingDoc,
    existingSource: source,
    targetRole,
    payload: req.body,
  });

  await syncSystemRoleMembers();
  await appendAuditLog({
    action: "UPDATE",
    entityType: "USER",
    entityId: String(result.doc._id),
    message: `Updated ${toSentenceCase(targetRole)} user ${result.doc.email}`,
    severity: "INFO",
    metadata: { source: result.source, role: targetRole },
    performedBy: req.user,
  });

  res.status(200).json({
    success: true,
    data: formatAdminUser(result.doc, result.source),
  });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const source = req.params.source.toUpperCase();
  const id = req.params.id;
  const model = getModelForSource(source);
  const existingDoc = await model.findById(id);

  if (!existingDoc) {
    throw createHttpError(404, "User not found");
  }

  if (String(req.user._id) === String(existingDoc._id) && req.adminSource === source) {
    throw createHttpError(400, "You cannot delete the current Admin account");
  }

  await model.findByIdAndDelete(id);
  await AdminRole.updateMany(
    {},
    {
      $pull: {
        members: {
          source,
          userId: existingDoc._id,
        },
      },
    },
  );

  await syncSystemRoleMembers();
  await appendAuditLog({
    action: "DELETE",
    entityType: "USER",
    entityId: String(existingDoc._id),
    message: `Deleted user ${existingDoc.email}`,
    severity: "MEDIUM",
    metadata: { source },
    performedBy: req.user,
  });

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

exports.getRoles = asyncHandler(async (req, res) => {
  await ensureAdminSetup();
  await syncSystemRoleMembers();

  const [roles, users] = await Promise.all([
    AdminRole.find().sort({ isSystemRole: -1, name: 1 }),
    fetchAdminUsers(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        roleTemplates: roles.length,
        assignedMembers: roles.reduce((total, role) => total + role.members.length, 0),
        editablePermissions: permissionDomains.length * permissionActions.length,
        protectedRoles: roles.filter((role) => role.isSystemRole).length,
      },
      roles: roles.map(buildRoleResponse),
      assignableUsers: users.map((user) => ({
        id: user.id,
        source: user.source,
        name: user.fullName,
        email: user.email,
        role: user.role,
      })),
    },
  });
});

exports.createRole = asyncHandler(async (req, res) => {
  const { name = "", scope = "Custom", description = "" } = req.body;

  if (!name.trim()) {
    throw createHttpError(400, "Role name is required");
  }

  const code = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const existingRole = await AdminRole.findOne({
    $or: [{ name: name.trim() }, { code }],
  });

  if (existingRole) {
    throw createHttpError(409, "Role already exists");
  }

  const role = await AdminRole.create({
    name: name.trim(),
    code,
    scope: scope.trim() || "Custom",
    description: description.trim(),
    permissions: buildPermissionPreset("custom"),
    members: [],
  });

  await appendAuditLog({
    action: "CREATE",
    entityType: "ROLE",
    entityId: String(role._id),
    message: `Created role ${role.name}`,
    severity: "INFO",
    metadata: { code: role.code },
    performedBy: req.user,
  });

  res.status(201).json({
    success: true,
    data: buildRoleResponse(role),
  });
});

exports.updateRolePermissions = asyncHandler(async (req, res) => {
  const role = await AdminRole.findById(req.params.id);

  if (!role) {
    throw createHttpError(404, "Role not found");
  }

  role.permissions = sanitizePermissionMatrix(req.body.permissions || {});
  await role.save();

  await appendAuditLog({
    action: "UPDATE",
    entityType: "ROLE",
    entityId: String(role._id),
    message: `Updated permission matrix for role ${role.name}`,
    severity: "MEDIUM",
    metadata: { code: role.code },
    performedBy: req.user,
  });

  res.status(200).json({
    success: true,
    data: buildRoleResponse(role),
  });
});

exports.assignRole = asyncHandler(async (req, res) => {
  const { source = "", userId = "" } = req.body;
  const role = await AdminRole.findById(req.params.id);

  if (!role) {
    throw createHttpError(404, "Role not found");
  }

  const normalizedSource = source.toUpperCase();

  if (!["USER", "CRM"].includes(normalizedSource) || !userId) {
    throw createHttpError(400, "Valid user assignment is required");
  }

  const model = getModelForSource(normalizedSource);
  const existingDoc = await model.findById(userId);

  if (!existingDoc) {
    throw createHttpError(404, "Assignable user not found");
  }

  let assignmentSource = normalizedSource;
  let assignmentDoc = existingDoc;

  if (role.systemRoleKey) {
    const result = await saveUserRecord({
      existingDoc,
      existingSource: normalizedSource,
      targetRole: role.systemRoleKey,
      payload: {
        fullName: normalizedSource === "USER" ? existingDoc.name : existingDoc.fullName,
        email: existingDoc.email,
        department: existingDoc.department || "",
        scope: existingDoc.scope || existingDoc.territory || existingDoc.state || "",
        status: normalizeAccessStatus(existingDoc),
      },
    });

    assignmentSource = result.source;
    assignmentDoc = result.doc;
    await syncSystemRoleMembers();
  } else {
    const memberKey = `${normalizedSource}:${String(existingDoc._id)}`;
    const currentMembers = role.members || [];

    if (!currentMembers.some((member) => `${member.source}:${String(member.userId)}` === memberKey)) {
      role.members.push({
        source: normalizedSource,
        userId: existingDoc._id,
        name: normalizedSource === "USER" ? existingDoc.name : existingDoc.fullName,
        email: existingDoc.email,
      });
      await role.save();
    }
  }

  await appendAuditLog({
    action: "ASSIGN",
    entityType: "ROLE",
    entityId: String(role._id),
    message: `Assigned ${role.name} role to ${assignmentDoc.email}`,
    severity: "INFO",
    metadata: { userId: String(assignmentDoc._id), source: assignmentSource },
    performedBy: req.user,
  });

  const refreshedRole = await AdminRole.findById(role._id);

  res.status(200).json({
    success: true,
    data: buildRoleResponse(refreshedRole),
  });
});
