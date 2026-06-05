const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const createHttpError = require("http-errors");
const asyncHandler = require("../middleware/async.middleware");
const CrmUser = require("../models/CrmUser");
const Lead = require("../models/Lead");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");
const {
  LEAD_STATUSES,
} = require("../constants/lead-generator.constants");
const {
  CANONICAL_ZONES,
  normalizeZoneInput,
  normalizeIndianStateInput,
  inferZoneFromTerritory,
  getZoneStates,
  isValidStateForZone,
  getAvailableStatesForZone,
  buildZoneRegex,
} = require("../utils/zone.util");
const { replaceCrmProfileImage } = require("../services/profile-image-storage.service");

const TERMINAL_LEAD_STATUSES = ["CONVERTED", "LOST", "REJECTED"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 80;
const FULL_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const RESERVED_STATE_MANAGER_STATUSES = ["ACTIVE", "PENDING_INVITE"];

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getUserZone = (user = {}) => {
  return normalizeZoneInput(user.territory) || inferZoneFromTerritory(user.territory);
};

const normalizeFullName = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    throw createHttpError(400, "Full name is required.");
  }

  if (normalized.length < FULL_NAME_MIN_LENGTH || normalized.length > FULL_NAME_MAX_LENGTH) {
    throw createHttpError(
      400,
      `Full name must be between ${FULL_NAME_MIN_LENGTH} and ${FULL_NAME_MAX_LENGTH} characters.`,
    );
  }

  if (!FULL_NAME_PATTERN.test(normalized)) {
    throw createHttpError(400, "Full name can only contain letters, spaces, apostrophes, hyphens, and periods.");
  }

  return normalized;
};

const buildTerritoryFilter = (zone = "") => {
  const regex = buildZoneRegex(zone);
  if (!regex) {
    return {};
  }

  return { territory: regex };
};

const buildReservedStateManagerQuery = ({
  zone = "",
  state = "",
  excludedUserId = null,
  statuses = RESERVED_STATE_MANAGER_STATUSES,
} = {}) => {
  const normalizedZone = normalizeZoneInput(zone);
  const normalizedState = normalizeIndianStateInput(state);

  if (!normalizedZone || !normalizedState) {
    return null;
  }

  const query = {
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(normalizedZone),
    state: normalizedState,
    accessStatus: { $in: statuses },
  };

  if (excludedUserId) {
    query._id = { $ne: excludedUserId };
  }

  return query;
};

const getReservedStatesForZone = async ({
  zone = "",
  excludedUserId = null,
  statuses = RESERVED_STATE_MANAGER_STATUSES,
} = {}) => {
  const normalizedZone = normalizeZoneInput(zone);
  if (!normalizedZone) {
    return [];
  }

  const query = {
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(normalizedZone),
    accessStatus: { $in: statuses },
  };

  if (excludedUserId) {
    query._id = { $ne: excludedUserId };
  }

  const managers = await CrmUser.find(query).select("state");
  return managers
    .map((item) => normalizeIndianStateInput(item.state))
    .filter(Boolean);
};

const resolveStateForZone = (zone, state) => {
  const normalizedState = normalizeIndianStateInput(state);
  if (!normalizedState || !isValidStateForZone(normalizedState, zone)) {
    throw createHttpError(400, "Selected state is not valid for your zone.");
  }

  return normalizedState;
};

const formatStateManagerStatus = (manager = {}) => {
  if (manager.accessStatus === "PENDING_INVITE") {
    return "PENDING_APPROVAL";
  }

  if (manager.accessStatus === "RESTRICTED" || !manager.isActive) {
    return "DENIED";
  }

  return "ACTIVE";
};

const formatStateManagerAccount = (manager, { zone = "", activeLeadMap = new Map() } = {}) => ({
  id: String(manager._id),
  fullName: manager.fullName,
  email: manager.email,
  zone: zone || getUserZone(manager),
  state: manager.state || "",
  phone: manager.phone || "",
  profileImage: manager.profileImageUrl || "",
  accessStatus: manager.accessStatus,
  accountStatus: formatStateManagerStatus(manager),
  isActive: Boolean(manager.isActive),
  activeLeads: activeLeadMap.get(String(manager._id)) || 0,
  createdAt: manager.createdAt,
  updatedAt: manager.updatedAt,
});

const resolvePagination = (page, limit) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const requestedLimit = Number.parseInt(limit, 10) || DEFAULT_LIMIT;
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const buildDateFilter = (date = "") => {
  const normalizedDate = String(date || "").trim().toLowerCase();
  if (!normalizedDate || normalizedDate === "all dates") {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (normalizedDate === "today") {
    return { $gte: startOfToday };
  }

  if (normalizedDate === "yesterday") {
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    return { $gte: startOfYesterday, $lt: startOfToday };
  }

  if (normalizedDate === "this_week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    return { $gte: startOfWeek };
  }

  if (normalizedDate === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { $gte: startOfMonth };
  }

  return null;
};

const resolveZoneLeadGeneratorIds = async (zone) => {
  if (!zone) {
    return [];
  }

  const generators = await CrmUser.find({
    role: "LEAD_GENERATOR",
    ...buildTerritoryFilter(zone),
  }).select("_id");

  return generators.map((user) => user._id);
};

const assertZonalManagerAccess = (user = {}) => {
  if (!user || user.role !== "ZONAL_MANAGER") {
    throw createHttpError(403, "Access denied. Zonal Manager role required.");
  }
};

const assertLeadBelongsToZone = (lead, zone) => {
  const leadZone = inferZoneFromTerritory(lead?.createdBy?.territory || "");
  if (!leadZone || leadZone !== zone) {
    throw createHttpError(403, "You can only access leads from your assigned zone.");
  }
};

const formatLead = (lead) => ({
  id: String(lead._id),
  leadCode: lead.leadCode,
  contactName: lead.contactName,
  companyName: lead.companyName,
  phone: lead.phone,
  alternatePhone: lead.alternatePhone || "",
  email: lead.email || "",
  businessCategory: lead.businessCategory,
  leadSource: lead.leadSource,
  status: lead.status,
  priority: lead.priority,
  city: lead.city,
  state: lead.state,
  address: lead.address || "",
  pincode: lead.pincode || "",
  notes: lead.notes || "",
  nextFollowUpAt: lead.nextFollowUpAt || null,
  lastContactedAt: lead.lastContactedAt || null,
  dealValue: Number(lead.dealValue || 0),
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  activities: Array.isArray(lead.activities)
    ? lead.activities.map((item) => ({
        outcome: item.outcome,
        notes: item.notes,
        interactionMode: item.interactionMode || "Call",
        nextFollowUpAt: item.nextFollowUpAt || null,
        date: item.date,
      }))
    : [],
  createdBy: lead.createdBy
    ? {
        id: String(lead.createdBy._id),
        fullName: lead.createdBy.fullName,
        email: lead.createdBy.email || "",
        role: lead.createdBy.role,
        territory: lead.createdBy.territory || "",
        profileImage: lead.createdBy.profileImageUrl || "",
      }
    : null,
  assignedTo: lead.assignedTo
    ? {
        id: String(lead.assignedTo._id),
        fullName: lead.assignedTo.fullName,
        email: lead.assignedTo.email || "",
        role: lead.assignedTo.role,
        territory: lead.assignedTo.territory || "",
        state: lead.assignedTo.state || "",
        profileImage: lead.assignedTo.profileImageUrl || "",
      }
    : null,
});

exports.signup = asyncHandler(async (req, res) => {
  const { email, zone, password, confirmPassword, fullName } = req.body;

  if (!email || !zone || !password || !confirmPassword || !fullName) {
    throw createHttpError(400, "All fields are required (fullName, email, zone, password, confirmPassword)");
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, "Passwords do not match");
  }

  if (String(password).length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  const normalizedZone = normalizeZoneInput(zone);
  if (!normalizedZone) {
    throw createHttpError(400, "Valid zone is required (North, South, East, West)");
  }

  const normalizedFullName = normalizeFullName(fullName);
  const normalizedEmail = String(email).trim().toLowerCase();

  const [existingUser, existingZoneManager, totalZonalManagers] = await Promise.all([
    CrmUser.findOne({ email: normalizedEmail }),
    CrmUser.findOne({
      role: "ZONAL_MANAGER",
      ...buildTerritoryFilter(normalizedZone),
    }).select("_id"),
    CrmUser.countDocuments({ role: "ZONAL_MANAGER" }),
  ]);

  if (existingUser) {
    throw createHttpError(409, "User with this email already exists");
  }

  if (existingZoneManager) {
    throw createHttpError(409, `${normalizedZone} Zone Manager already exists. Only one zonal manager is allowed per zone.`);
  }

  if (totalZonalManagers >= 4) {
    throw createHttpError(409, "All zonal manager slots are already filled (North, South, East, West).");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    password: hashedPassword,
    role: "ZONAL_MANAGER",
    territory: normalizedZone,
    accessStatus: "ACTIVE",
    isActive: true,
  });

  const tokenPair = await issueTokenPair({ user, source: "CRM", req });
  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(201).json({
    success: true,
    message: "Zonal Manager registered successfully",
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      zone: normalizedZone,
      role: user.role,
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, zone, password } = req.body;

  if (!email || !zone || !password) {
    throw createHttpError(400, "Email, zone, and password are required");
  }

  const normalizedZone = normalizeZoneInput(zone);
  if (!normalizedZone) {
    throw createHttpError(400, "Valid zone is required (North, South, East, West)");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await CrmUser.findOne({ email: normalizedEmail }).select("+password");

  if (!user || user.role !== "ZONAL_MANAGER") {
    throw createHttpError(401, "Invalid email, zone, or password");
  }

  if (getUserZone(user) !== normalizedZone) {
    throw createHttpError(401, "Incorrect zone for this user");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Account is inactive or restricted.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw createHttpError(401, "Invalid email, zone, or password");
  }

  const tokenPair = await issueTokenPair({ user, source: "CRM", req });
  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(200).json({
    success: true,
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      zone: normalizedZone,
      role: user.role,
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, "Current password and new password are required.");
  }

  if (String(newPassword).length < 8) {
    throw createHttpError(400, "New password must be at least 8 characters.");
  }

  const user = await CrmUser.findById(req.user._id);
  if (!user) {
    throw createHttpError(404, "User not found.");
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatches) {
    throw createHttpError(401, "Current password is incorrect.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  res.status(200).json({
    success: true,
    data: {
      id: String(req.user._id),
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      zone: getUserZone(req.user),
      state: req.user.state || "",
      phone: req.user.phone || "",
      profileImage: req.user.profileImageUrl || "",
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { fullName } = req.body;

  if (fullName === undefined) {
    throw createHttpError(400, "fullName is required.");
  }

  const normalizedFullName = normalizeFullName(fullName);

  const user = await CrmUser.findById(req.user._id);
  if (!user) {
    throw createHttpError(404, "User not found.");
  }

  user.fullName = normalizedFullName;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      zone: getUserZone(user),
      state: user.state || "",
      phone: user.phone || "",
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.uploadProfilePhoto = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  if (!req.file) {
    throw createHttpError(400, "Profile photo file is required.");
  }

  const user = await CrmUser.findById(req.user._id);
  if (!user) {
    throw createHttpError(404, "User not found.");
  }

  const uploaded = await replaceCrmProfileImage(req.file, {
    userId: user._id,
    role: user.role,
    previousPublicId: user.profileImagePublicId,
  });

  user.profileImageUrl = uploaded.url;
  user.profileImagePublicId = uploaded.publicId;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully.",
    data: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      zone: getUserZone(user),
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const [generatorIds, stateManagers, activeFseUsers] = await Promise.all([
    resolveZoneLeadGeneratorIds(zone),
    CrmUser.find({
      role: "STATE_MANAGER",
      ...buildTerritoryFilter(zone),
      isActive: true,
      accessStatus: { $ne: "RESTRICTED" },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select("_id fullName email territory state profileImageUrl"),
    CrmUser.find({
      role: "FSE",
      ...buildTerritoryFilter(zone),
      isActive: true,
      accessStatus: { $ne: "RESTRICTED" },
    }).select("_id"),
  ]);

  if (!generatorIds.length) {
    return res.status(200).json({
      success: true,
      data: {
        pendingValidation: 0,
        activeManagers: stateManagers.length,
        activeFses: activeFseUsers.length,
        totalAssigned: 0,
        converted: 0,
        conversionRate: "0%",
        conversionGrowth: "0%",
        teamOverview: stateManagers.map((manager) => {
          const initials = String(manager.fullName || "SM")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "SM";

          return {
            id: String(manager._id),
            initials,
            name: manager.fullName,
            location: manager.state || zone,
            activeLeads: 0,
            status: "Active",
            profileImage: manager.profileImageUrl || "",
          };
        }),
        recentActivity: [],
      },
    });
  }

  const [leads, managerLeadCounts, recentLeads, thisMonthConversions, prevMonthConversions] = await Promise.all([
    Lead.find({ createdBy: { $in: generatorIds } })
      .sort({ updatedAt: -1 }),
    stateManagers.length
      ? Lead.aggregate([
          {
            $match: {
              assignedTo: { $in: stateManagers.map((manager) => manager._id) },
              status: { $nin: TERMINAL_LEAD_STATUSES },
            },
          },
          {
            $group: {
              _id: "$assignedTo",
              activeLeads: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
    Lead.find({
      createdBy: { $in: generatorIds },
      status: { $in: ["FORWARDED", "ASSIGNED", "CONVERTED", "REJECTED", "LOST"] },
    })
      .populate("assignedTo", "fullName role profileImageUrl")
      .sort({ updatedAt: -1 })
      .limit(100),
    Lead.countDocuments({
      createdBy: { $in: generatorIds },
      status: "CONVERTED",
      updatedAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
    Lead.countDocuments({
      createdBy: { $in: generatorIds },
      status: "CONVERTED",
      updatedAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
  ]);

  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const totalLeads = leads.length;
  const totalAssigned = Number(statusCounts.ASSIGNED || 0);
  const converted = Number(statusCounts.CONVERTED || 0);
  const pendingValidation =
    Number(statusCounts.FORWARDED || 0) +
    Number(statusCounts.NEW || 0) +
    Number(statusCounts.CONTACTED || 0) +
    Number(statusCounts.QUALIFIED || 0) +
    Number(statusCounts.FOLLOW_UP || 0);

  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const conversionGrowth = prevMonthConversions > 0
    ? Math.round(((thisMonthConversions - prevMonthConversions) / prevMonthConversions) * 100)
    : thisMonthConversions > 0
      ? 100
      : 0;

  const activeLeadMap = new Map(
    managerLeadCounts.map((item) => [String(item._id), Number(item.activeLeads || 0)]),
  );

  const teamOverview = stateManagers.map((manager) => {
    const name = manager.fullName || "State Manager";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "SM";

    return {
      id: String(manager._id),
      initials,
      name,
      location: manager.state || zone,
      activeLeads: activeLeadMap.get(String(manager._id)) || 0,
      status: "Active",
      profileImage: manager.profileImageUrl || "",
    };
  });

  const recentActivity = recentLeads.map((lead) => {
    const status = String(lead.status || "").toUpperCase();
    const type =
      status === "CONVERTED"
        ? "success"
        : status === "REJECTED" || status === "LOST"
          ? "danger"
          : "primary";

    return {
      id: String(lead._id),
      type,
      text: `Lead ${lead.leadCode || "#"} ${status.toLowerCase()}${lead.assignedTo?.fullName ? ` by ${lead.assignedTo.fullName}` : ""}`,
      time: new Date(lead.updatedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });

  res.status(200).json({
    success: true,
    data: {
      pendingValidation,
      activeManagers: stateManagers.length,
      activeFses: activeFseUsers.length,
      totalAssigned,
      converted,
      conversionRate: `${conversionRate}%`,
      conversionGrowth: `${conversionGrowth >= 0 ? "+" : ""}${conversionGrowth}%`,
      teamOverview,
      recentActivity,
    },
  });
});

exports.getLeads = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const myZone = getUserZone(req.user);
  if (!myZone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const { search, location, date, status } = req.query;
  const { page, limit, skip } = resolvePagination(req.query.page, req.query.limit);

  let targetZone = myZone;
  if (location && String(location).trim() && String(location).trim() !== "All Zones") {
    const requestedZone = normalizeZoneInput(String(location).replace(" Zone", "").trim());
    if (!requestedZone) {
      throw createHttpError(400, "Invalid zone filter.");
    }

    if (requestedZone !== myZone) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        pagination: { page, limit, totalPages: 0 },
        data: [],
      });
    }

    targetZone = requestedZone;
  }

  const generatorIds = await resolveZoneLeadGeneratorIds(targetZone);
  if (!generatorIds.length) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      pagination: { page, limit, totalPages: 0 },
      data: [],
    });
  }

  const query = {
    createdBy: { $in: generatorIds },
  };

  if (status && String(status).trim()) {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!LEAD_STATUSES.includes(normalizedStatus)) {
      throw createHttpError(400, "Invalid lead status filter.");
    }
    query.status = normalizedStatus;
  }

  if (search && String(search).trim()) {
    const safeRegex = { $regex: escapeRegExp(String(search).trim()), $options: "i" };
    query.$or = [
      { companyName: safeRegex },
      { contactName: safeRegex },
      { phone: safeRegex },
      { leadCode: safeRegex },
    ];
  }

  const createdAtFilter = buildDateFilter(date);
  if (createdAtFilter) {
    query.createdAt = createdAtFilter;
  }

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate("createdBy", "fullName territory email role profileImageUrl")
      .populate("assignedTo", "fullName email territory role state profileImageUrl")
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    },
    data: leads.map(formatLead),
  });
});

exports.getStateManagers = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const stateManagers = await CrmUser.find({
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(zone),
    isActive: true,
    accessStatus: { $ne: "RESTRICTED" },
  }).select("_id fullName email territory state phone profileImageUrl");

  const managerIds = stateManagers.map((manager) => manager._id);
  const leadCounts = managerIds.length
    ? await Lead.aggregate([
        {
          $match: {
            assignedTo: { $in: managerIds },
            status: { $nin: TERMINAL_LEAD_STATUSES },
          },
        },
        {
          $group: {
            _id: "$assignedTo",
            activeLeads: { $sum: 1 },
          },
        },
      ])
    : [];

  const activeLeadMap = new Map(
    leadCounts.map((item) => [String(item._id), Number(item.activeLeads || 0)]),
  );

  res.status(200).json({
    success: true,
    data: stateManagers.map((manager) => ({
      id: String(manager._id),
      fullName: manager.fullName,
      email: manager.email,
      zone: getUserZone(manager),
      state: manager.state || "",
      phone: manager.phone || "",
      activeLeads: activeLeadMap.get(String(manager._id)) || 0,
      profileImage: manager.profileImageUrl || "",
    })),
  });
});

exports.getStateManagerSignupMeta = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const excludedUserId = String(req.query.excludeUserId || "").trim();
  const includeCurrentState = normalizeIndianStateInput(req.query.currentState);
  const reservedStates = await getReservedStatesForZone({
    zone,
    excludedUserId: excludedUserId || null,
  });

  const availableStates = getAvailableStatesForZone(zone, reservedStates);
  const orderedZoneStates = getZoneStates(zone);
  const mergedStates = includeCurrentState && !availableStates.includes(includeCurrentState)
    ? [...availableStates, includeCurrentState]
    : availableStates;

  mergedStates.sort((left, right) => orderedZoneStates.indexOf(left) - orderedZoneStates.indexOf(right));

  res.status(200).json({
    success: true,
    data: {
      zones: CANONICAL_ZONES,
      zone,
      availableStates: mergedStates,
    },
  });
});

exports.getStateManagerRegistry = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const stateManagers = await CrmUser.find({
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(zone),
  })
    .sort({ createdAt: -1 })
    .select("_id fullName email territory state phone profileImageUrl isActive accessStatus createdAt updatedAt");

  const managerIds = stateManagers.map((manager) => manager._id);
  const leadCounts = managerIds.length
    ? await Lead.aggregate([
        {
          $match: {
            assignedTo: { $in: managerIds },
            status: { $nin: TERMINAL_LEAD_STATUSES },
          },
        },
        {
          $group: {
            _id: "$assignedTo",
            activeLeads: { $sum: 1 },
          },
        },
      ])
    : [];

  const activeLeadMap = new Map(
    leadCounts.map((item) => [String(item._id), Number(item.activeLeads || 0)]),
  );

  res.status(200).json({
    success: true,
    data: stateManagers.map((manager) =>
      formatStateManagerAccount(manager, { zone, activeLeadMap }),
    ),
  });
});

exports.createStateManagerAccount = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { fullName, email, password, confirmPassword, state } = req.body;
  const zone = getUserZone(req.user);

  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  if (!fullName || !email || !state || !password || !confirmPassword) {
    throw createHttpError(
      400,
      "All fields are required (fullName, email, state, password, confirmPassword).",
    );
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, "Passwords do not match");
  }

  if (String(password).length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  const normalizedFullName = normalizeFullName(fullName);
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedState = resolveStateForZone(zone, state);

  const [existingUser, existingStateReservation] = await Promise.all([
    CrmUser.findOne({ email: normalizedEmail }).select("_id"),
    CrmUser.findOne(buildReservedStateManagerQuery({ zone, state: normalizedState })).select("_id"),
  ]);

  if (existingUser) {
    throw createHttpError(409, "User with this email already exists");
  }

  if (existingStateReservation) {
    throw createHttpError(409, `${normalizedState} already has an active or pending State Manager.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdManager = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    password: passwordHash,
    role: "STATE_MANAGER",
    territory: zone,
    state: normalizedState,
    accessStatus: "ACTIVE",
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "State Manager account created successfully.",
    data: formatStateManagerAccount(createdManager, { zone }),
  });
});

exports.reviewStateManagerAccount = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { id } = req.params;
  const decision = String(req.body.decision || "").trim().toUpperCase();
  const zone = getUserZone(req.user);

  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  if (!["APPROVE", "DENY"].includes(decision)) {
    throw createHttpError(400, "Decision must be APPROVE or DENY.");
  }

  const manager = await CrmUser.findOne({
    _id: id,
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(zone),
  });

  if (!manager) {
    throw createHttpError(404, "State Manager request not found in your zone.");
  }

  const requestedState = req.body.state !== undefined ? req.body.state : manager.state;
  const normalizedState = resolveStateForZone(zone, requestedState);

  if (decision === "APPROVE") {
    const existingStateReservation = await CrmUser.findOne(
      buildReservedStateManagerQuery({
        zone,
        state: normalizedState,
        excludedUserId: manager._id,
      }),
    ).select("_id");

    if (existingStateReservation) {
      throw createHttpError(409, `${normalizedState} already has an active or pending State Manager.`);
    }

    manager.state = normalizedState;
    manager.accessStatus = "ACTIVE";
    manager.isActive = true;
  } else {
    manager.state = normalizedState;
    manager.accessStatus = "RESTRICTED";
    manager.isActive = false;
  }

  await manager.save();

  res.status(200).json({
    success: true,
    message:
      decision === "APPROVE"
        ? "State Manager approved successfully."
        : "State Manager request denied.",
    data: formatStateManagerAccount(manager, { zone }),
  });
});

exports.deleteStateManagerAccount = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { id } = req.params;
  const zone = getUserZone(req.user);

  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const manager = await CrmUser.findOne({
    _id: id,
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(zone),
  }).select("_id email state accessStatus isActive");

  if (!manager) {
    throw createHttpError(404, "State Manager account not found in your zone.");
  }

  const linkedLeadCount = await Lead.countDocuments({
    $or: [{ assignedTo: manager._id }, { assignedBy: manager._id }],
  });

  if (linkedLeadCount > 0) {
    throw createHttpError(
      409,
      "Cannot delete this State Manager because lead history is linked. Use deny/restrict instead.",
    );
  }

  await CrmUser.deleteOne({ _id: manager._id });

  res.status(200).json({
    success: true,
    message: "State Manager account deleted permanently.",
    data: {
      id: String(manager._id),
      email: manager.email,
    },
  });
});

exports.assignLead = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { id } = req.params;
  const stateManagerId =
    String(req.body.stateManagerId || req.body.managerId || "").trim();

  if (!stateManagerId || stateManagerId.length !== 24) {
    throw createHttpError(400, "Valid stateManagerId is required.");
  }

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const [lead, manager] = await Promise.all([
    Lead.findById(id).populate("createdBy", "territory"),
    CrmUser.findById(stateManagerId),
  ]);

  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (TERMINAL_LEAD_STATUSES.includes(lead.status)) {
    throw createHttpError(409, "Terminal leads cannot be reassigned.");
  }

  if (!manager || manager.role !== "STATE_MANAGER" || !manager.isActive || manager.accessStatus === "RESTRICTED") {
    throw createHttpError(404, "Active State Manager not found");
  }

  assertLeadBelongsToZone(lead, zone);

  const managerZone = getUserZone(manager);
  if (!managerZone || managerZone !== zone) {
    throw createHttpError(403, "State Manager must belong to your zone.");
  }

  lead.assignedTo = manager._id;
  lead.assignedBy = req.user._id;
  lead.updatedBy = req.user._id;
  lead.status = "FORWARDED";
  await lead.save();

  const hydratedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName territory email role profileImageUrl")
    .populate("assignedTo", "fullName email territory role state profileImageUrl");

  res.status(200).json({
    success: true,
    message: "Lead assigned to State Manager successfully",
    data: formatLead(hydratedLead),
  });
});

exports.updateLeadStatus = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { id } = req.params;
  const { status } = req.body;
  const nextStatus = String(status || "").trim().toUpperCase();
  const allowedStatuses = ["FORWARDED", "ASSIGNED", "CONVERTED", "REJECTED", "LOST"];

  if (!allowedStatuses.includes(nextStatus)) {
    throw createHttpError(400, `Status must be one of: ${allowedStatuses.join(", ")}`);
  }

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const lead = await Lead.findById(id).populate("createdBy", "territory");
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  assertLeadBelongsToZone(lead, zone);

  if (nextStatus === "ASSIGNED" && !lead.assignedTo) {
    throw createHttpError(400, "Lead must be assigned before moving to ASSIGNED.");
  }

  lead.status = nextStatus;
  lead.updatedBy = req.user._id;

  if (nextStatus === "CONVERTED") {
    lead.convertedAt = new Date();
  }

  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName territory email role profileImageUrl")
    .populate("assignedTo", "fullName email territory role state profileImageUrl");

  res.status(200).json({
    success: true,
    message: "Lead status updated successfully",
    data: formatLead(updatedLead),
  });
});

exports.logLeadActivity = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { id } = req.params;
  const { outcome, notes, nextFollowUpAt, activityIndex } = req.body;

  if (!outcome || !notes) {
    throw createHttpError(400, "Outcome and notes are required");
  }

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const lead = await Lead.findById(id).populate("createdBy", "territory");
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  assertLeadBelongsToZone(lead, zone);

  const payload = {
    outcome: String(outcome).trim(),
    notes: String(notes).trim(),
    nextFollowUpAt: nextFollowUpAt || null,
    date: new Date(),
  };

  if (activityIndex !== undefined && activityIndex !== null) {
    const parsedIndex = Number(activityIndex);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || !lead.activities[parsedIndex]) {
      throw createHttpError(404, "Activity not found");
    }

    lead.activities[parsedIndex] = {
      ...lead.activities[parsedIndex].toObject(),
      ...payload,
      date: lead.activities[parsedIndex].date,
    };
  } else {
    lead.activities.push(payload);
  }

  if (nextFollowUpAt) {
    lead.nextFollowUpAt = nextFollowUpAt;
  }

  lead.lastContactedAt = new Date();
  lead.updatedBy = req.user._id;
  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName territory email role profileImageUrl")
    .populate("assignedTo", "fullName email territory role state profileImageUrl");

  res.status(200).json({
    success: true,
    data: formatLead(updatedLead),
  });
});

exports.deleteLeadActivity = asyncHandler(async (req, res) => {
  assertZonalManagerAccess(req.user);

  const { id, index } = req.params;
  const parsedIndex = Number(index);

  if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
    throw createHttpError(400, "Invalid activity index.");
  }

  const zone = getUserZone(req.user);
  if (!zone) {
    throw createHttpError(403, "Unable to resolve zone for this Zonal Manager account.");
  }

  const lead = await Lead.findById(id).populate("createdBy", "territory");
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  assertLeadBelongsToZone(lead, zone);

  if (!lead.activities[parsedIndex]) {
    throw createHttpError(404, "Activity not found");
  }

  lead.activities.splice(parsedIndex, 1);
  lead.updatedBy = req.user._id;
  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName territory email role profileImageUrl")
    .populate("assignedTo", "fullName email territory role state profileImageUrl");

  res.status(200).json({
    success: true,
    data: formatLead(updatedLead),
  });
});
