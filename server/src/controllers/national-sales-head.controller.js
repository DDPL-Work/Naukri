const mongoose = require("mongoose");
const CrmUser = require("../models/CrmUser");
const Lead = require("../models/Lead");
const NationalSalesPolicy = require("../models/NationalSalesPolicy");
const asyncHandler = require("../middleware/async.middleware");
const createHttpError = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");

const ZONES = ["North", "South", "East", "West"];
const PENDING_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP"];
const FORWARDED_OR_ASSIGNED = ["FORWARDED", "ASSIGNED"];
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;
const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 80;
const FULL_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const ensureNationalSalesHead = (req) => {
  if (!req.user || req.user.role !== "NATIONAL_SALES_HEAD") {
    throw createHttpError(403, "Access denied. National Sales Head role required.");
  }
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeZone = (value = "") => {
  const next = String(value || "")
    .replace(/\bzone\b/gi, "")
    .trim();
  if (!next) {
    return "";
  }

  const matched = ZONES.find((zone) => zone.toLowerCase() === next.toLowerCase());
  return matched || "";
};

const getZoneFromValue = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }

  if (/\bnorth\b/.test(normalized)) {
    return "North";
  }
  if (/\bsouth\b/.test(normalized)) {
    return "South";
  }
  if (/\beast\b/.test(normalized)) {
    return "East";
  }
  if (/\bwest\b/.test(normalized)) {
    return "West";
  }

  return "Unknown";
};

const buildZoneTerritoryQuery = (zone) => {
  const normalizedZone = normalizeZone(zone);
  if (!normalizedZone) {
    return {};
  }

  return {
    territory: {
      $regex: `\\b${escapeRegExp(normalizedZone)}\\b`,
      $options: "i",
    },
  };
};

const zoneExpressionFromField = (fieldPath) => ({
  $let: {
    vars: {
      zoneText: { $toLower: { $ifNull: [fieldPath, ""] } },
    },
    in: {
      $switch: {
        branches: [
          {
            case: { $regexMatch: { input: "$$zoneText", regex: "\\bnorth\\b" } },
            then: "North",
          },
          {
            case: { $regexMatch: { input: "$$zoneText", regex: "\\bsouth\\b" } },
            then: "South",
          },
          {
            case: { $regexMatch: { input: "$$zoneText", regex: "\\beast\\b" } },
            then: "East",
          },
          {
            case: { $regexMatch: { input: "$$zoneText", regex: "\\bwest\\b" } },
            then: "West",
          },
        ],
        default: "Unknown",
      },
    },
  },
});

const resolvePagination = (page, limit) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const requestedLimit = Number.parseInt(limit, 10) || DEFAULT_PAGE_LIMIT;
  const safeLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, requestedLimit));

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
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

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const resolveAccountStatus = (user = {}) => {
  if (user.accessStatus === "PENDING_INVITE") {
    return "PENDING_APPROVAL";
  }

  if (user.accessStatus === "RESTRICTED" || !user.isActive) {
    return "DENIED";
  }

  return "ACTIVE";
};

const toZonalManagerSummary = (user = {}) => {
  const zone = getZoneFromValue(user.territory);

  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    zone: ZONES.includes(zone) ? zone : "Unknown",
    accessStatus: user.accessStatus || "ACTIVE",
    accountStatus: resolveAccountStatus(user),
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const toStateManagerSummary = (user = {}, metrics = {}) => {
  const zone = getZoneFromValue(user.territory);
  const totalAssignedLeads = Number(metrics.totalAssignedLeads || 0);
  const convertedLeads = Number(metrics.convertedLeads || 0);

  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    zone: ZONES.includes(zone) ? zone : "Unknown",
    state: user.state || "",
    phone: user.phone || "",
    accessStatus: user.accessStatus || "ACTIVE",
    accountStatus: resolveAccountStatus(user),
    isActive: Boolean(user.isActive),
    totalAssignedLeads,
    convertedLeads,
    conversionRate: totalAssignedLeads > 0 ? Math.round((convertedLeads / totalAssignedLeads) * 100) : 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const buildStateManagerStatusFilter = (status = "") => {
  const normalizedStatus = String(status || "").trim().toUpperCase();

  if (!normalizedStatus || normalizedStatus === "ALL") {
    return null;
  }

  if (normalizedStatus === "ACTIVE") {
    return {
      accessStatus: "ACTIVE",
      isActive: true,
    };
  }

  if (normalizedStatus === "PENDING_APPROVAL") {
    return {
      accessStatus: "PENDING_INVITE",
    };
  }

  if (normalizedStatus === "DENIED") {
    return {
      $or: [{ accessStatus: "RESTRICTED" }, { isActive: false }],
    };
  }

  throw createHttpError(400, "status must be one of ALL, ACTIVE, PENDING_APPROVAL, DENIED.");
};

const isValidDate = (value) => {
  return value instanceof Date && !Number.isNaN(value.getTime());
};

const buildDateFilter = ({ date, startDate, endDate }) => {
  const normalizedDate = String(date || "").trim().toLowerCase();
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

  const parsedStart = startDate ? new Date(startDate) : null;
  const parsedEnd = endDate ? new Date(endDate) : null;

  if (parsedStart && !isValidDate(parsedStart)) {
    throw createHttpError(400, "Invalid startDate.");
  }

  if (parsedEnd && !isValidDate(parsedEnd)) {
    throw createHttpError(400, "Invalid endDate.");
  }

  if (parsedStart || parsedEnd) {
    return {
      ...(parsedStart ? { $gte: parsedStart } : {}),
      ...(parsedEnd ? { $lte: parsedEnd } : {}),
    };
  }

  return null;
};

const toLeadSummary = (lead) => ({
  id: lead._id,
  leadCode: lead.leadCode,
  companyName: lead.companyName,
  contactName: lead.contactName,
  phone: lead.phone,
  email: lead.email,
  city: lead.city,
  state: lead.state,
  status: lead.status,
  priority: lead.priority,
  businessCategory: lead.businessCategory,
  zone: getZoneFromValue(lead.createdBy?.territory),
  generatorName: lead.createdBy?.fullName || "Unknown",
  assignedTo: lead.assignedTo
    ? {
        id: lead.assignedTo._id,
        fullName: lead.assignedTo.fullName,
        role: lead.assignedTo.role,
      }
    : null,
  dealValue: Number(lead.dealValue || 0),
  currency: lead.currency || "INR",
  requiresNationalApproval: Boolean(lead.requiresNationalApproval),
  isStrategicDeal: Boolean(lead.isStrategicDeal),
  approvalStatus: lead.approvalStatus || "NOT_REQUIRED",
  approvalLevel: lead.approvalLevel || "STATE_MANAGER",
  approvalRequestedAt: lead.approvalRequestedAt || null,
  approvalDecisionAt: lead.approvalDecisionAt || null,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

const buildZoneStats = async (createdAtFilter = null) => {
  const leadMatch = createdAtFilter ? { createdAt: createdAtFilter } : {};

  const [leadStatsByZone, membersByZone] = await Promise.all([
    Lead.aggregate([
      { $match: leadMatch },
      {
        $lookup: {
          from: "crmusers",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $unwind: {
          path: "$creator",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          zone: zoneExpressionFromField("$creator.territory"),
        },
      },
      {
        $match: {
          zone: { $in: ZONES },
        },
      },
      {
        $group: {
          _id: "$zone",
          totalLeads: { $sum: 1 },
          converted: {
            $sum: {
              $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
            },
          },
          forwarded: {
            $sum: {
              $cond: [{ $in: ["$status", FORWARDED_OR_ASSIGNED] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $in: ["$status", PENDING_STATUSES] }, 1, 0],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "CONVERTED"] },
                { $ifNull: ["$dealValue", 0] },
                0,
              ],
            },
          },
        },
      },
    ]),
    CrmUser.aggregate([
      {
        $match: {
          isActive: true,
          role: { $in: ["LEAD_GENERATOR", "STATE_MANAGER", "FSE"] },
        },
      },
      {
        $addFields: {
          zone: zoneExpressionFromField("$territory"),
        },
      },
      {
        $match: {
          zone: { $in: ZONES },
        },
      },
      {
        $group: {
          _id: {
            zone: "$zone",
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const leadMap = new Map(leadStatsByZone.map((item) => [item._id, item]));
  const userMap = new Map();

  membersByZone.forEach((item) => {
    const zone = item?._id?.zone || "Unknown";
    const role = item?._id?.role || "UNKNOWN";

    if (!userMap.has(zone)) {
      userMap.set(zone, { LEAD_GENERATOR: 0, STATE_MANAGER: 0, FSE: 0 });
    }

    userMap.get(zone)[role] = item.count;
  });

  return ZONES.map((zone) => {
    const metrics = leadMap.get(zone) || {};
    const members = userMap.get(zone) || { LEAD_GENERATOR: 0, STATE_MANAGER: 0, FSE: 0 };
    const totalLeads = Number(metrics.totalLeads || 0);
    const converted = Number(metrics.converted || 0);

    return {
      zone,
      totalLeads,
      forwarded: Number(metrics.forwarded || 0),
      converted,
      pending: Number(metrics.pending || 0),
      conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
      revenue: Number(metrics.revenue || 0),
      activeLGs: Number(members.LEAD_GENERATOR || 0),
      activeSMs: Number(members.STATE_MANAGER || 0),
      activeFSEs: Number(members.FSE || 0),
    };
  });
};

const getOrCreatePolicy = async () => {
  return NationalSalesPolicy.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
};

const toPolicyResponse = (policy) => ({
  highValueDealThreshold: Number(policy.highValueDealThreshold || 0),
  strategicDealThreshold: Number(policy.strategicDealThreshold || 0),
  currency: policy.currency || "INR",
  autoApproveBelowThreshold: Boolean(policy.autoApproveBelowThreshold),
  notes: policy.notes || "",
  updatedAt: policy.updatedAt,
  updatedBy: policy.updatedBy
    ? {
        id: policy.updatedBy._id,
        fullName: policy.updatedBy.fullName,
        role: policy.updatedBy.role,
      }
    : null,
});
// POST /auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createHttpError(400, "Email and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await CrmUser.findOne({ email: normalizedEmail });

  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (user.role !== "NATIONAL_SALES_HEAD") {
    throw createHttpError(403, "Access denied. Only National Sales Head can log in here.");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Account is inactive or restricted.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  const tokenPair = await issueTokenPair({ user, source: "CRM", req });
  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(200).json({
    success: true,
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
});

// GET /dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const [lgCount, smCount, fseCount, statusBreakdown, zoneStats, recentLeads] = await Promise.all([
    CrmUser.countDocuments({ role: "LEAD_GENERATOR", isActive: true }),
    CrmUser.countDocuments({ role: "STATE_MANAGER", isActive: true }),
    CrmUser.countDocuments({ role: "FSE", isActive: true }),
    Lead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          convertedRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "CONVERTED"] },
                { $ifNull: ["$dealValue", 0] },
                0,
              ],
            },
          },
        },
      },
    ]),
    buildZoneStats(),
    Lead.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "fullName territory")
      .populate("assignedTo", "fullName role"),
  ]);

  const statusMap = new Map(statusBreakdown.map((item) => [item._id, item.count]));
  const totalLeads = statusBreakdown.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const convertedLeads = Number(statusMap.get("CONVERTED") || 0);
  const forwardedLeads = Number(statusMap.get("FORWARDED") || 0);
  const assignedLeads = Number(statusMap.get("ASSIGNED") || 0);
  const rejectedLeads = Number(statusMap.get("REJECTED") || 0) + Number(statusMap.get("LOST") || 0);
  const pendingLeads = PENDING_STATUSES.reduce((sum, status) => sum + Number(statusMap.get(status) || 0), 0);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthRevenueResult, lastMonthRevenueResult] = await Promise.all([
    Lead.aggregate([
      {
        $match: {
          status: "CONVERTED",
          createdAt: { $gte: thisMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          value: { $sum: { $ifNull: ["$dealValue", 0] } },
        },
      },
    ]),
    Lead.aggregate([
      {
        $match: {
          status: "CONVERTED",
          createdAt: { $gte: lastMonthStart, $lt: thisMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          value: { $sum: { $ifNull: ["$dealValue", 0] } },
        },
      },
    ]),
  ]);

  const thisMonthRevenue = Number(thisMonthRevenueResult[0]?.value || 0);
  const lastMonthRevenue = Number(lastMonthRevenueResult[0]?.value || 0);
  const totalRevenue = statusBreakdown.reduce((sum, item) => sum + Number(item.convertedRevenue || 0), 0);
  const revenueGrowthPercent = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : thisMonthRevenue > 0
      ? 100
      : 0;

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalLeads,
        forwardedLeads,
        assignedLeads,
        convertedLeads,
        rejectedLeads,
        pendingLeads,
        conversionRate,
        activeLGs: lgCount,
        activeSMs: smCount,
        activeFSEs: fseCount,
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        revenueGrowthPercent,
      },
      zoneStats,
      recentLeads: recentLeads.map((lead) => ({
        id: lead._id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        status: lead.status,
        zone: getZoneFromValue(lead.createdBy?.territory),
        generatorName: lead.createdBy?.fullName || "Unknown",
        assigneeName: lead.assignedTo?.fullName || "",
        dealValue: Number(lead.dealValue || 0),
        createdAt: lead.createdAt,
      })),
    },
  });
});
// GET /zones
exports.getZoneStats = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const [zoneStats, lgUsers, smUsers] = await Promise.all([
    buildZoneStats(buildDateFilter(req.query)),
    CrmUser.find({ role: "LEAD_GENERATOR", isActive: true }).select("_id fullName territory"),
    CrmUser.find({ role: "STATE_MANAGER", isActive: true }).select("_id fullName territory"),
  ]);

  const lgByZone = new Map();
  const smByZone = new Map();

  lgUsers.forEach((user) => {
    const zone = getZoneFromValue(user.territory);
    if (!ZONES.includes(zone)) {
      return;
    }
    if (!lgByZone.has(zone)) {
      lgByZone.set(zone, []);
    }
    lgByZone.get(zone).push({ id: user._id, name: user.fullName });
  });

  smUsers.forEach((user) => {
    const zone = getZoneFromValue(user.territory);
    if (!ZONES.includes(zone)) {
      return;
    }
    if (!smByZone.has(zone)) {
      smByZone.set(zone, []);
    }
    smByZone.get(zone).push({ id: user._id, name: user.fullName });
  });

  const merged = zoneStats.map((zoneItem) => ({
    zone: zoneItem.zone,
    totalLeads: zoneItem.totalLeads,
    forwarded: zoneItem.forwarded,
    converted: zoneItem.converted,
    pending: zoneItem.pending,
    conversionRate: zoneItem.conversionRate,
    revenue: zoneItem.revenue,
    lgCount: zoneItem.activeLGs,
    smCount: zoneItem.activeSMs,
    fseCount: zoneItem.activeFSEs,
    leadGenerators: lgByZone.get(zoneItem.zone) || [],
    stateManagers: smByZone.get(zoneItem.zone) || [],
  }));

  res.status(200).json({
    success: true,
    data: merged,
  });
});

// GET /leads
exports.getAllLeads = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const { search, status, date, startDate, endDate } = req.query;
  const zone = normalizeZone(req.query.zone);
  const { page, limit, skip } = resolvePagination(req.query.page, req.query.limit);

  let generatorIds = null;
  if (zone) {
    const lgUsers = await CrmUser.find({
      role: "LEAD_GENERATOR",
      ...buildZoneTerritoryQuery(zone),
    }).select("_id");
    generatorIds = lgUsers.map((user) => user._id);

    if (!generatorIds.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        pagination: {
          page,
          limit,
          totalPages: 0,
        },
        data: [],
      });
    }
  }

  const query = {};

  if (generatorIds) {
    query.createdBy = { $in: generatorIds };
  }

  if (status && String(status).trim()) {
    query.status = String(status).trim().toUpperCase();
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

  const createdAtFilter = buildDateFilter({ date, startDate, endDate });
  if (createdAtFilter) {
    query.createdAt = createdAtFilter;
  }

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate("createdBy", "fullName territory email")
      .populate("assignedTo", "fullName role")
      .sort({ createdAt: -1 })
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
    data: leads.map(toLeadSummary),
  });
});
// GET /performance/states
exports.getStatePerformance = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const { search, date, startDate, endDate } = req.query;
  const zone = normalizeZone(req.query.zone);
  const { page, limit, skip } = resolvePagination(req.query.page, req.query.limit);

  const createdAtFilter = buildDateFilter({ date, startDate, endDate });
  const stateSearch = String(search || "").trim();

  const pipeline = [
    {
      $lookup: {
        from: "crmusers",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    {
      $unwind: {
        path: "$creator",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        zone: zoneExpressionFromField("$creator.territory"),
        stateName: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ["$state", ""] } }, 0] },
            "$state",
            "Unknown",
          ],
        },
      },
    },
  ];

  const match = {};
  if (zone) {
    match.zone = zone;
  }

  if (stateSearch) {
    match.stateName = { $regex: escapeRegExp(stateSearch), $options: "i" };
  }

  if (createdAtFilter) {
    match.createdAt = createdAtFilter;
  }

  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    {
      $group: {
        _id: "$stateName",
        totalLeads: { $sum: 1 },
        converted: {
          $sum: {
            $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
          },
        },
        pending: {
          $sum: {
            $cond: [{ $in: ["$status", PENDING_STATUSES] }, 1, 0],
          },
        },
        forwarded: {
          $sum: {
            $cond: [{ $in: ["$status", FORWARDED_OR_ASSIGNED] }, 1, 0],
          },
        },
        revenue: {
          $sum: {
            $cond: [
              { $eq: ["$status", "CONVERTED"] },
              { $ifNull: ["$dealValue", 0] },
              0,
            ],
          },
        },
        zones: { $addToSet: "$zone" },
      },
    },
    {
      $project: {
        _id: 0,
        state: "$_id",
        totalLeads: 1,
        converted: 1,
        pending: 1,
        forwarded: 1,
        revenue: 1,
        zones: 1,
        conversionRate: {
          $cond: [
            { $gt: ["$totalLeads", 0] },
            {
              $round: [
                {
                  $multiply: [{ $divide: ["$converted", "$totalLeads"] }, 100],
                },
                0,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { totalLeads: -1, state: 1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
      },
    },
  );

  const result = await Lead.aggregate(pipeline);
  const items = result[0]?.items || [];
  const total = Number(result[0]?.meta?.[0]?.total || 0);

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});
// GET /performance/individual
exports.getIndividualPerformance = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const allowedRoles = ["LEAD_GENERATOR", "STATE_MANAGER", "FSE"];
  const role = String(req.query.role || "LEAD_GENERATOR").trim().toUpperCase();

  if (!allowedRoles.includes(role)) {
    throw createHttpError(400, `role must be one of: ${allowedRoles.join(", ")}`);
  }

  const zone = normalizeZone(req.query.zone);
  const stateFilter = String(req.query.state || "").trim();
  const search = String(req.query.search || "").trim();
  const createdAtFilter = buildDateFilter(req.query);
  const { page, limit, skip } = resolvePagination(req.query.page, req.query.limit);

  const userQuery = {
    role,
    isActive: true,
  };

  if (zone) {
    Object.assign(userQuery, buildZoneTerritoryQuery(zone));
  }

  if (stateFilter) {
    userQuery.state = {
      $regex: `^${escapeRegExp(stateFilter)}$`,
      $options: "i",
    };
  }

  if (search) {
    const regex = { $regex: escapeRegExp(search), $options: "i" };
    userQuery.$or = [{ fullName: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    CrmUser.find(userQuery)
      .select("_id fullName email role territory state")
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit),
    CrmUser.countDocuments(userQuery),
  ]);

  if (!users.length) {
    return res.status(200).json({
      success: true,
      data: {
        items: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      },
    });
  }

  const userIds = users.map((user) => user._id);
  const metricsByUser = new Map();

  if (role === "LEAD_GENERATOR" || role === "FSE") {
    const leadMatch = {
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(role === "LEAD_GENERATOR"
        ? { createdBy: { $in: userIds } }
        : { assignedTo: { $in: userIds } }),
    };

    const groupedMetrics = await Lead.aggregate([
      { $match: leadMatch },
      {
        $group: {
          _id: role === "LEAD_GENERATOR" ? "$createdBy" : "$assignedTo",
          totalLeads: { $sum: 1 },
          converted: {
            $sum: {
              $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $in: ["$status", PENDING_STATUSES] }, 1, 0],
            },
          },
          forwarded: {
            $sum: {
              $cond: [{ $in: ["$status", FORWARDED_OR_ASSIGNED] }, 1, 0],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "CONVERTED"] },
                { $ifNull: ["$dealValue", 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    groupedMetrics.forEach((row) => {
      metricsByUser.set(String(row._id), row);
    });
  } else {
    const states = users
      .map((user) => String(user.state || "").trim().toLowerCase())
      .filter(Boolean);
    const zones = users
      .map((user) => getZoneFromValue(user.territory))
      .filter((item) => ZONES.includes(item))
      .filter(Boolean);

    const [stateMetrics, zoneMetrics] = await Promise.all([
      states.length
        ? Lead.aggregate([
            {
              $match: {
                ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
                state: { $exists: true, $ne: "" },
              },
            },
            {
              $project: {
                normalizedState: { $toLower: "$state" },
                status: 1,
                dealValue: { $ifNull: ["$dealValue", 0] },
              },
            },
            {
              $match: {
                normalizedState: { $in: states },
              },
            },
            {
              $group: {
                _id: "$normalizedState",
                totalLeads: { $sum: 1 },
                converted: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [{ $in: ["$status", PENDING_STATUSES] }, 1, 0],
                  },
                },
                forwarded: {
                  $sum: {
                    $cond: [{ $in: ["$status", FORWARDED_OR_ASSIGNED] }, 1, 0],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "CONVERTED"] }, "$dealValue", 0],
                  },
                },
              },
            },
          ])
        : Promise.resolve([]),
      zones.length
        ? Lead.aggregate([
            {
              $match: {
                ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
              },
            },
            {
              $lookup: {
                from: "crmusers",
                localField: "createdBy",
                foreignField: "_id",
                as: "creator",
              },
            },
            {
              $unwind: {
                path: "$creator",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                normalizedZone: zoneExpressionFromField("$creator.territory"),
              },
            },
            {
              $match: {
                normalizedZone: { $in: zones },
              },
            },
            {
              $group: {
                _id: "$normalizedZone",
                totalLeads: { $sum: 1 },
                converted: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [{ $in: ["$status", PENDING_STATUSES] }, 1, 0],
                  },
                },
                forwarded: {
                  $sum: {
                    $cond: [{ $in: ["$status", FORWARDED_OR_ASSIGNED] }, 1, 0],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "CONVERTED"] },
                      { $ifNull: ["$dealValue", 0] },
                      0,
                    ],
                  },
                },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const stateMap = new Map(stateMetrics.map((item) => [item._id, item]));
    const zoneMap = new Map(zoneMetrics.map((item) => [item._id, item]));

    users.forEach((user) => {
      const userState = String(user.state || "").trim().toLowerCase();
      if (userState && stateMap.has(userState)) {
        metricsByUser.set(String(user._id), stateMap.get(userState));
      } else {
        metricsByUser.set(String(user._id), zoneMap.get(getZoneFromValue(user.territory)) || null);
      }
    });
  }
  const items = users.map((user) => {
    const metrics = metricsByUser.get(String(user._id)) || {};
    const totalLeads = Number(metrics.totalLeads || 0);
    const converted = Number(metrics.converted || 0);

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      territory: user.territory || "",
      state: user.state || "",
      metrics: {
        totalLeads,
        converted,
        pending: Number(metrics.pending || 0),
        forwarded: Number(metrics.forwarded || 0),
        revenue: Number(metrics.revenue || 0),
        conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
      },
    };
  });

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});
// GET /approvals/pending
exports.getPendingApprovals = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const { search, date, startDate, endDate } = req.query;
  const zone = normalizeZone(req.query.zone);
  const { page, limit, skip } = resolvePagination(req.query.page, req.query.limit);

  const query = {
    requiresNationalApproval: true,
    approvalStatus: "PENDING",
  };

  if (zone) {
    const lgUsers = await CrmUser.find({
      role: "LEAD_GENERATOR",
      ...buildZoneTerritoryQuery(zone),
    }).select("_id");
    const generatorIds = lgUsers.map((user) => user._id);

    if (!generatorIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    query.createdBy = { $in: generatorIds };
  }

  if (search && String(search).trim()) {
    const safeRegex = { $regex: escapeRegExp(String(search).trim()), $options: "i" };
    query.$or = [
      { companyName: safeRegex },
      { contactName: safeRegex },
      { leadCode: safeRegex },
      { phone: safeRegex },
    ];
  }

  const createdAtFilter = buildDateFilter({ date, startDate, endDate });
  if (createdAtFilter) {
    query.createdAt = createdAtFilter;
  }

  const [items, total] = await Promise.all([
    Lead.find(query)
      .sort({ approvalRequestedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "fullName territory role")
      .populate("assignedTo", "fullName role")
      .populate("approvalRequestedBy", "fullName role"),
    Lead.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: items.map((lead) => ({
        ...toLeadSummary(lead),
        approvalRequestedBy: lead.approvalRequestedBy
          ? {
              id: lead.approvalRequestedBy._id,
              fullName: lead.approvalRequestedBy.fullName,
              role: lead.approvalRequestedBy.role,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

// POST /approvals/:id/decision
exports.reviewApproval = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, "Invalid lead id");
  }

  const decision = String(req.body.decision || "").trim().toUpperCase();
  const note = String(req.body.note || "").trim();
  const approvedDealValue = req.body.approvedDealValue;

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw createHttpError(400, "decision must be APPROVE or REJECT");
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (lead.approvalStatus !== "PENDING" && !lead.requiresNationalApproval) {
    throw createHttpError(409, "This lead is not pending National Sales Head approval.");
  }

  if (approvedDealValue !== undefined && approvedDealValue !== null) {
    const numericDealValue = Number(approvedDealValue);
    if (!Number.isFinite(numericDealValue) || numericDealValue < 0) {
      throw createHttpError(400, "approvedDealValue must be a valid non-negative number.");
    }
    lead.dealValue = numericDealValue;
  }

  if (decision === "APPROVE") {
    lead.approvalStatus = "APPROVED";
    lead.approvalLevel = "NATIONAL_SALES_HEAD";
    lead.requiresNationalApproval = false;
    lead.status = "CONVERTED";
    lead.convertedAt = new Date();
  } else {
    lead.approvalStatus = "REJECTED";
    lead.approvalLevel = "NATIONAL_SALES_HEAD";
    lead.requiresNationalApproval = false;

    if (lead.status !== "CONVERTED") {
      lead.status = "LOST";
    }
  }

  lead.approvalDecisionBy = req.user._id;
  lead.approvalDecisionAt = new Date();
  lead.approvalDecisionNote = note;
  lead.updatedBy = req.user._id;

  await lead.save();

  const hydratedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName territory role")
    .populate("assignedTo", "fullName role")
    .populate("approvalRequestedBy", "fullName role")
    .populate("approvalDecisionBy", "fullName role");

  res.status(200).json({
    success: true,
    message: decision === "APPROVE" ? "Lead approved successfully." : "Lead rejected successfully.",
    data: {
      ...toLeadSummary(hydratedLead),
      approvalRequestedBy: hydratedLead.approvalRequestedBy
        ? {
            id: hydratedLead.approvalRequestedBy._id,
            fullName: hydratedLead.approvalRequestedBy.fullName,
            role: hydratedLead.approvalRequestedBy.role,
          }
        : null,
      approvalDecisionBy: hydratedLead.approvalDecisionBy
        ? {
            id: hydratedLead.approvalDecisionBy._id,
            fullName: hydratedLead.approvalDecisionBy.fullName,
            role: hydratedLead.approvalDecisionBy.role,
          }
        : null,
      approvalDecisionNote: hydratedLead.approvalDecisionNote || "",
    },
  });
});
// GET /approval-policy
exports.getApprovalPolicy = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const policy = await getOrCreatePolicy();
  const hydratedPolicy = await NationalSalesPolicy.findById(policy._id).populate("updatedBy", "fullName role");

  res.status(200).json({
    success: true,
    data: toPolicyResponse(hydratedPolicy),
  });
});

// PUT /approval-policy
exports.updateApprovalPolicy = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const updates = {};

  if (req.body.highValueDealThreshold !== undefined) {
    const value = Number(req.body.highValueDealThreshold);
    if (!Number.isFinite(value) || value < 0) {
      throw createHttpError(400, "highValueDealThreshold must be a non-negative number");
    }
    updates.highValueDealThreshold = value;
  }

  if (req.body.strategicDealThreshold !== undefined) {
    const value = Number(req.body.strategicDealThreshold);
    if (!Number.isFinite(value) || value < 0) {
      throw createHttpError(400, "strategicDealThreshold must be a non-negative number");
    }
    updates.strategicDealThreshold = value;
  }

  if (req.body.currency !== undefined) {
    const currency = String(req.body.currency || "").trim().toUpperCase();
    if (!currency) {
      throw createHttpError(400, "currency cannot be empty");
    }
    updates.currency = currency;
  }

  if (req.body.autoApproveBelowThreshold !== undefined) {
    updates.autoApproveBelowThreshold = Boolean(req.body.autoApproveBelowThreshold);
  }

  if (req.body.notes !== undefined) {
    updates.notes = String(req.body.notes || "").trim();
  }

  const existing = await getOrCreatePolicy();

  const highValueDealThreshold = updates.highValueDealThreshold !== undefined
    ? updates.highValueDealThreshold
    : existing.highValueDealThreshold;

  const strategicDealThreshold = updates.strategicDealThreshold !== undefined
    ? updates.strategicDealThreshold
    : existing.strategicDealThreshold;

  if (strategicDealThreshold < highValueDealThreshold) {
    throw createHttpError(400, "strategicDealThreshold cannot be less than highValueDealThreshold");
  }

  const policy = await NationalSalesPolicy.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        ...updates,
        updatedBy: req.user._id,
      },
      $setOnInsert: {
        key: "default",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).populate("updatedBy", "fullName role");

  res.status(200).json({
    success: true,
    message: "Approval policy updated successfully.",
    data: toPolicyResponse(policy),
  });
});

// GET /zonal-managers
exports.getZonalManagers = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const zonalManagers = await CrmUser.find({ role: "ZONAL_MANAGER" })
    .select("_id fullName email territory accessStatus isActive createdAt updatedAt")
    .sort({ territory: 1, createdAt: 1 });

  const items = zonalManagers.map(toZonalManagerSummary);
  const managerByZone = new Map();

  items.forEach((item) => {
    if (!managerByZone.has(item.zone)) {
      managerByZone.set(item.zone, item);
    }
  });

  const zoneSlots = ZONES.map((zone) => ({
    zone,
    occupied: managerByZone.has(zone),
    manager: managerByZone.get(zone) || null,
  }));

  res.status(200).json({
    success: true,
    data: {
      totalSlots: ZONES.length,
      usedSlots: items.length,
      availableSlots: Math.max(0, ZONES.length - items.length),
      zones: zoneSlots,
      items,
    },
  });
});

// POST /zonal-managers
exports.createZonalManager = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const { fullName, email, password, confirmPassword, zone } = req.body;
  const normalizedZone = normalizeZone(zone);

  if (!fullName || !email || !password || !confirmPassword || !normalizedZone) {
    throw createHttpError(
      400,
      "All fields are required (fullName, email, zone, password, confirmPassword).",
    );
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, "Passwords do not match.");
  }

  if (String(password).length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  const normalizedFullName = normalizeFullName(fullName);
  const normalizedEmail = normalizeEmail(email);

  const [existingUserByEmail, existingManagerForZone, zonalManagerCount] = await Promise.all([
    CrmUser.findOne({ email: normalizedEmail }).select("_id"),
    CrmUser.findOne({
      role: "ZONAL_MANAGER",
      ...buildZoneTerritoryQuery(normalizedZone),
    }).select("_id"),
    CrmUser.countDocuments({ role: "ZONAL_MANAGER" }),
  ]);

  if (existingUserByEmail) {
    throw createHttpError(409, "User with this email already exists.");
  }

  if (existingManagerForZone) {
    throw createHttpError(
      409,
      `${normalizedZone} Zone already has a Zonal Manager. Delete that account before creating a new one.`,
    );
  }

  if (zonalManagerCount >= ZONES.length) {
    throw createHttpError(
      409,
      "All 4 zonal manager slots are occupied. Delete one zonal manager to create a new account.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const createdManager = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    password: hashedPassword,
    role: "ZONAL_MANAGER",
    territory: normalizedZone,
    accessStatus: "ACTIVE",
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: `${normalizedZone} Zone Manager created successfully.`,
    data: toZonalManagerSummary(createdManager),
  });
});

// DELETE /zonal-managers/:id
exports.deleteZonalManager = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, "Invalid zonal manager id.");
  }

  const manager = await CrmUser.findOne({
    _id: id,
    role: "ZONAL_MANAGER",
  }).select("_id fullName email territory accessStatus isActive createdAt updatedAt");

  if (!manager) {
    throw createHttpError(404, "Zonal Manager not found.");
  }

  await CrmUser.deleteOne({ _id: manager._id });

  res.status(200).json({
    success: true,
    message: "Zonal Manager deleted successfully.",
    data: {
      id: String(manager._id),
      fullName: manager.fullName,
      email: manager.email,
      zone: getZoneFromValue(manager.territory),
    },
  });
});

// GET /state-managers/overview
exports.getStateManagersOverview = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  const zone = normalizeZone(req.query.zone);
  const stateFilter = String(req.query.state || "").trim();
  const search = String(req.query.search || "").trim();
  const statusFilter = buildStateManagerStatusFilter(req.query.status);
  const { page, limit, skip } = resolvePagination(req.query.page, req.query.limit);

  const conditions = [{ role: "STATE_MANAGER" }];

  if (zone) {
    conditions.push(buildZoneTerritoryQuery(zone));
  }

  if (stateFilter) {
    conditions.push({
      state: {
        $regex: `^${escapeRegExp(stateFilter)}$`,
        $options: "i",
      },
    });
  }

  if (search) {
    const regex = { $regex: escapeRegExp(search), $options: "i" };
    conditions.push({
      $or: [{ fullName: regex }, { email: regex }, { state: regex }, { territory: regex }],
    });
  }

  if (statusFilter) {
    conditions.push(statusFilter);
  }

  const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

  const [items, total, allManagers] = await Promise.all([
    CrmUser.find(query)
      .select("_id fullName email territory state phone accessStatus isActive createdAt updatedAt")
      .sort({ territory: 1, state: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CrmUser.countDocuments(query),
    CrmUser.find({ role: "STATE_MANAGER" }).select("_id territory accessStatus isActive"),
  ]);

  const itemIds = items.map((item) => item._id);
  const allManagerIds = allManagers.map((item) => item._id);

  const [itemLeadMetrics, overallLeadMetrics] = await Promise.all([
    itemIds.length
      ? Lead.aggregate([
          {
            $match: {
              assignedTo: { $in: itemIds },
            },
          },
          {
            $group: {
              _id: "$assignedTo",
              totalAssignedLeads: { $sum: 1 },
              convertedLeads: {
                $sum: {
                  $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
                },
              },
            },
          },
        ])
      : Promise.resolve([]),
    allManagerIds.length
      ? Lead.aggregate([
          {
            $match: {
              assignedTo: { $in: allManagerIds },
            },
          },
          {
            $group: {
              _id: null,
              totalAssignedLeads: { $sum: 1 },
              convertedLeads: {
                $sum: {
                  $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
                },
              },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const leadMetricMap = new Map(itemLeadMetrics.map((item) => [String(item._id), item]));
  const totalAssignedLeads = Number(overallLeadMetrics[0]?.totalAssignedLeads || 0);
  const totalConvertedLeads = Number(overallLeadMetrics[0]?.convertedLeads || 0);

  const baseZoneSummary = new Map(
    ZONES.map((zoneName) => [
      zoneName,
      {
        zone: zoneName,
        totalStateManagers: 0,
        activeStateManagers: 0,
        pendingApprovals: 0,
        deniedStateManagers: 0,
      },
    ]),
  );

  let activeStateManagers = 0;
  let pendingApprovals = 0;
  let deniedStateManagers = 0;

  allManagers.forEach((manager) => {
    const accountStatus = resolveAccountStatus(manager);
    const zoneName = getZoneFromValue(manager.territory);

    if (accountStatus === "ACTIVE") {
      activeStateManagers += 1;
    } else if (accountStatus === "PENDING_APPROVAL") {
      pendingApprovals += 1;
    } else {
      deniedStateManagers += 1;
    }

    if (!baseZoneSummary.has(zoneName)) {
      return;
    }

    const zoneEntry = baseZoneSummary.get(zoneName);
    zoneEntry.totalStateManagers += 1;
    if (accountStatus === "ACTIVE") {
      zoneEntry.activeStateManagers += 1;
    } else if (accountStatus === "PENDING_APPROVAL") {
      zoneEntry.pendingApprovals += 1;
    } else {
      zoneEntry.deniedStateManagers += 1;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalStateManagers: allManagers.length,
        activeStateManagers,
        pendingApprovals,
        deniedStateManagers,
        totalAssignedLeads,
        totalConvertedLeads,
        conversionRate:
          totalAssignedLeads > 0 ? Math.round((totalConvertedLeads / totalAssignedLeads) * 100) : 0,
      },
      zoneSummary: Array.from(baseZoneSummary.values()),
      items: items.map((item) => toStateManagerSummary(item, leadMetricMap.get(String(item._id)) || {})),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

// GET /profile
exports.getProfile = asyncHandler(async (req, res) => {
  ensureNationalSalesHead(req);

  res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone || "",
      department: req.user.department || "National Sales",
      territory: "India",
    },
  });
});
