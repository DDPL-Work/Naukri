const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const createHttpError = require("http-errors");
const asyncHandler = require("../middleware/async.middleware");
const CrmUser = require("../models/CrmUser");
const Lead = require("../models/Lead");
const NonVisitDay = require("../models/NonVisitDay");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");
const {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  BUSINESS_CATEGORIES,
} = require("../constants/lead-generator.constants");
const {
  CANONICAL_ZONES,
  normalizeZoneInput,
  normalizeIndianStateInput,
  inferZoneFromTerritory,
  getZoneStates,
  isValidStateForZone,
  buildZoneRegex,
} = require("../utils/zone.util");
const { replaceCrmProfileImage } = require("../services/profile-image-storage.service");

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 80;
const FULL_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const getUserZone = (user = {}) => {
  return normalizeZoneInput(user.territory) || inferZoneFromTerritory(user.territory);
};

const getUserState = (user = {}) => {
  return normalizeIndianStateInput(user.state) || "";
};

const hasDesignation = (user = {}, role = "") => {
  const targetRole = String(role || "").trim().toUpperCase();
  if (!targetRole) {
    return false;
  }

  const primaryRole = String(user.role || "").trim().toUpperCase();
  if (primaryRole === targetRole) {
    return true;
  }

  if (!Array.isArray(user.designations)) {
    return false;
  }

  return user.designations.some((item) => String(item || "").trim().toUpperCase() === targetRole);
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

const parseEnum = (value, allowedValues, fallback) => {
  const normalized = String(value || "").trim();
  return allowedValues.includes(normalized) ? normalized : fallback;
};

const PROJECTION_VALUES = ["", "WP > 50", "WP < 50", "MP < 50", "MP > 50"];

const normalizeCreateLeadInput = (payload = {}, user = {}) => {
  const normalizedUserState = getUserState(user);
  const normalizedPayloadState = normalizeIndianStateInput(payload.state);

  // Resolve primary contact from contacts array or flat fields
  const contactsRaw = Array.isArray(payload.contacts) ? payload.contacts : [];
  const primaryContact = contactsRaw[0] || {};
  const resolvedContactName = String(
    payload.contactName || payload.fullName || primaryContact.fullName || ""
  ).trim();
  const resolvedPhone = String(
    payload.phone || payload.phoneNumber || primaryContact.phone || ""
  ).trim();
  const resolvedEmail = String(
    payload.email || primaryContact.email || ""
  ).trim().toLowerCase();

  const normalizedContacts = contactsRaw.map((c, i) => ({
    fullName: String(c.fullName || "").trim(),
    phone: String(c.phone || "").trim(),
    email: String(c.email || "").trim().toLowerCase(),
    designation: String(c.designation || "").trim(),
    isPrimary: i === 0,
  })).filter(c => c.fullName || c.phone);

  const projectionRaw = String(payload.projection || "").trim();
  const projection = PROJECTION_VALUES.includes(projectionRaw) ? projectionRaw : "";

  const statusRaw = String(payload.status || "").trim().toUpperCase();
  const status = LEAD_STATUSES.includes(statusRaw) ? statusRaw : "ASSIGNED";

  return {
    contactName: resolvedContactName,
    companyName: String(payload.companyName || "").trim(),
    phone: resolvedPhone,
    alternatePhone: String(payload.alternatePhone || "").trim(),
    email: resolvedEmail,
    businessCategory: String(payload.businessCategory || "").trim(),
    leadSource: String(payload.leadSource || "").trim(),
    status,
    priority: parseEnum(payload.priority, LEAD_PRIORITIES, "MEDIUM"),
    city: String(payload.city || "").trim() || "Unknown",
    state: normalizedPayloadState || normalizedUserState || "Unknown",
    address: String(payload.address || payload.location || "").trim(),
    pincode: String(payload.pincode || "").trim(),
    employeeCount: String(payload.employeeCount || "").trim(),
    reference: String(payload.reference || "").trim(),
    notes: String(payload.notes || "").trim(),
    sourcingDate: payload.sourcingDate || null,
    projection,
    clientType: String(payload.clientType || "Standard").trim(),
    sourcedBy: String(payload.sourcedBy || "").trim(),
    contacts: normalizedContacts,
    nextFollowUpAt: payload.nextFollowUpAt || null,
  };
};

const ensureLeadPayload = (payload = {}) => {
  const requiredFields = [
    ["contactName", "Contact name is required"],
    ["companyName", "Company name is required"],
    ["phone", "Phone number is required"],
    ["businessCategory", "Business category is required"],
    ["leadSource", "Lead source is required"],
    ["address", "Location / address is required"],
  ];

  requiredFields.forEach(([field, message]) => {
    if (!String(payload[field] || "").trim()) {
      throw createHttpError(400, message);
    }
  });

  if (!BUSINESS_CATEGORIES.includes(payload.businessCategory)) {
    throw createHttpError(400, "Invalid business category");
  }

  if (!LEAD_SOURCES.includes(payload.leadSource)) {
    throw createHttpError(400, "Invalid lead source");
  }

  const normalizedPhone = Lead.normalizePhoneNumber(payload.phone);
  if (normalizedPhone.length < 10) {
    throw createHttpError(400, "Phone number must contain at least 10 digits");
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email).trim())) {
    throw createHttpError(400, "Enter a valid email address");
  }
};

const buildDateFilter = (date) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date === "today") {
    return { $gte: startOfToday };
  }

  if (date === "yesterday") {
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    return { $gte: startOfYesterday, $lt: startOfToday };
  }

  if (date === "this_week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    return { $gte: startOfWeek };
  }

  if (date === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { $gte: startOfMonth };
  }

  return null;
};

const formatLead = (lead) => ({
  id: String(lead._id),
  leadCode: lead.leadCode,
  companyName: lead.companyName,
  contactName: lead.contactName,
  phone: lead.phone,
  email: lead.email || "",
  city: lead.city,
  state: lead.state,
  address: lead.address || "",
  status: lead.status,
  priority: lead.priority,
  leadSource: lead.leadSource,
  businessCategory: lead.businessCategory,
  notes: lead.notes || "",
  tnc: lead.tnc || "",
  projection: lead.projection || "",
  clientType: lead.clientType || "Standard",
  sourcedBy: lead.sourcedBy || "",
  sourcingDate: lead.sourcingDate || null,
  contacts: Array.isArray(lead.contacts) ? lead.contacts : [],
  nextFollowUpAt: lead.nextFollowUpAt,
  lastContactedAt: lead.lastContactedAt,
  activities: (lead.activities || []).map((activity) => ({
    outcome: activity.outcome,
    notes: activity.notes,
    subStatus: activity.subStatus || "",
    interactionMode: activity.interactionMode || "Call",
    nextFollowUpAt: activity.nextFollowUpAt,
    date: activity.date,
    contact: activity.contact,
  })),
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  createdBy: lead.createdBy
    ? {
        id: String(lead.createdBy._id),
        fullName: lead.createdBy.fullName,
        role: lead.createdBy.role,
        zone: getUserZone(lead.createdBy),
        profileImage: lead.createdBy.profileImageUrl || "",
      }
    : null,
  assignedBy: lead.assignedBy
    ? {
        id: String(lead.assignedBy._id),
        fullName: lead.assignedBy.fullName,
        role: lead.assignedBy.role,
      }
    : null,
  assignedTo: lead.assignedTo
    ? {
        id: String(lead.assignedTo._id),
        fullName: lead.assignedTo.fullName,
        role: lead.assignedTo.role,
        profileImage: lead.assignedTo.profileImageUrl || "",
      }
    : null,
});

exports.getSignupMeta = asyncHandler(async (req, res) => {
  const requestedZone = normalizeZoneInput(req.query.zone);
  if (req.query.zone && !requestedZone) {
    throw createHttpError(400, "Invalid zone. Use North, South, East, or West.");
  }

  if (requestedZone) {
    return res.status(200).json({
      success: true,
      data: {
        zones: CANONICAL_ZONES,
        selectedZone: requestedZone,
        availableStates: getZoneStates(requestedZone),
      },
    });
  }

  const availableStatesByZone = Object.fromEntries(
    CANONICAL_ZONES.map((zone) => [zone, getZoneStates(zone)]),
  );

  res.status(200).json({
    success: true,
    data: {
      zones: CANONICAL_ZONES,
      availableStatesByZone,
    },
  });
});

exports.signup = asyncHandler(async (req, res) => {
  const { email, zone, state, password, confirmPassword, fullName } = req.body;

  if (!email || !zone || !state || !password || !confirmPassword || !fullName) {
    throw createHttpError(
      400,
      "All fields are required (fullName, email, zone, state, password, confirmPassword)",
    );
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

  const normalizedState = normalizeIndianStateInput(state);
  if (!normalizedState || !isValidStateForZone(normalizedState, normalizedZone)) {
    throw createHttpError(400, "Selected state is not valid for the selected zone.");
  }

  const normalizedFullName = normalizeFullName(fullName);
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await CrmUser.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createHttpError(409, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    password: hashedPassword,
    role: "FSE",
    territory: normalizedZone,
    state: normalizedState,
    accessStatus: "ACTIVE",
    isActive: true,
  });

  const tokenPair = await issueTokenPair({ user, source: "CRM", req });
  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(201).json({
    success: true,
    message: "FSE registered successfully",
    token: tokenPair.accessToken,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      zone: normalizedZone,
      state: normalizedState,
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

  if (!user || !hasDesignation(user, "FSE")) {
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
      state: getUserState(user),
      role: "FSE",
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createHttpError(400, "Current password and new password are required.");
  }

  if (newPassword.length < 8) {
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

exports.uploadProfilePhoto = asyncHandler(async (req, res) => {
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
      role: "FSE",
      zone: getUserZone(user),
      state: getUserState(user),
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.getLeadMeta = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      businessCategories: BUSINESS_CATEGORIES,
      leadSources: LEAD_SOURCES,
      leadPriorities: LEAD_PRIORITIES,
    },
  });
});

exports.createLead = asyncHandler(async (req, res) => {
  const input = normalizeCreateLeadInput(req.body, req.user);
  ensureLeadPayload(input);

  const normalizedPhone = Lead.normalizePhoneNumber(input.phone);
  const normalizedEmail = input.email;
  const duplicateFilter = normalizedEmail
    ? {
        $or: [{ phone: normalizedPhone }, { email: normalizedEmail }],
      }
    : { phone: normalizedPhone };

  const existingLead = await Lead.findOne(duplicateFilter).select("_id leadCode");
  if (existingLead) {
    throw createHttpError(
      409,
      `A lead already exists for this contact. Existing lead code: ${existingLead.leadCode}`,
    );
  }

  const lead = await Lead.create({
    contactName: input.contactName,
    companyName: input.companyName,
    phone: input.phone,
    alternatePhone: input.alternatePhone,
    email: normalizedEmail,
    contacts: input.contacts,
    businessCategory: input.businessCategory,
    leadSource: input.leadSource,
    status: "ASSIGNED",
    priority: input.priority,
    city: input.city,
    state: input.state,
    address: input.address,
    pincode: input.pincode,
    notes: input.notes,
    sourcingDate: input.sourcingDate || null,
    projection: input.projection || "",
    clientType: input.clientType || "Standard",
    sourcedBy: input.sourcedBy || req.user.fullName || "Self",
    nextFollowUpAt: input.nextFollowUpAt,
    createdBy: req.user._id,
    updatedBy: req.user._id,
    assignedTo: req.user._id,
    assignedBy: req.user._id,
  });

  const hydratedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName role territory profileImageUrl")
    .populate("assignedBy", "fullName role")
    .populate("assignedTo", "fullName role profileImageUrl");

  res.status(201).json({
    success: true,
    message: "Lead created and assigned successfully",
    data: formatLead(hydratedLead),
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const myZone = getUserZone(req.user);
  const baseQuery = { assignedTo: req.user._id };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // ── Date‑range filter ─────────────────────────────────────────────────────
  let startDate = null;
  let endDate = null;

  if (req.query.startDate) {
    const parsed = new Date(req.query.startDate);
    if (!Number.isNaN(parsed.getTime())) {
      startDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  if (req.query.endDate) {
    const parsed = new Date(req.query.endDate);
    if (!Number.isNaN(parsed.getTime())) {
      endDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1);
    }
  }

  const rangedQuery = { ...baseQuery };
  if (startDate || endDate) {
    rangedQuery.createdAt = {};
    if (startDate) rangedQuery.createdAt.$gte = startDate;
    if (endDate) rangedQuery.createdAt.$lt = endDate;
  }

  // ── Core counts (ranged) ──────────────────────────────────────────────────
  const [
    totalAssigned,
    converted,
    pending,
    followUpsToday,
    interestedCount,
    notInterestedCount,
    fieldVisitLeads,
    coldCallLeads,
    allLeadsInRange,
  ] = await Promise.all([
    Lead.countDocuments(rangedQuery),
    Lead.countDocuments({ ...rangedQuery, status: "CONVERTED" }),
    Lead.countDocuments({
      ...rangedQuery,
      status: { $in: ["ASSIGNED", "CONTACTED", "FOLLOW_UP", "QUALIFIED"] },
    }),
    Lead.countDocuments({
      ...baseQuery,
      nextFollowUpAt: { $gte: startOfToday, $lt: endOfToday },
    }),
    // "Interested" = leads whose latest activity outcome is "Interested"
    Lead.countDocuments({
      ...rangedQuery,
      "activities.0": { $exists: true },
      $expr: {
        $eq: [
          { $arrayElemAt: ["$activities.outcome", -1] },
          "Interested",
        ],
      },
    }),
    // "Not Interested" = leads whose latest activity outcome is "Not Interested"
    Lead.countDocuments({
      ...rangedQuery,
      "activities.0": { $exists: true },
      $expr: {
        $eq: [
          { $arrayElemAt: ["$activities.outcome", -1] },
          "Not Interested",
        ],
      },
    }),
    // "Field Visit" source = visits
    Lead.countDocuments({ ...rangedQuery, leadSource: "Field Visit" }),
    // "Cold Call" source = calls
    Lead.countDocuments({ ...rangedQuery, leadSource: "Cold Call" }),
    // All leads in range (for repeat-visit detection)
    Lead.find(rangedQuery).select("activities leadSource").lean(),
  ]);

  // ── Visit breakdown ───────────────────────────────────────────────────────
  // New Visit = visited leads with ZERO logged activities (first time)
  // Repeat Visit = visited leads with 1+ logged activities (followed up)
  const visitLeads = allLeadsInRange.filter((l) => l.leadSource === "Field Visit");
  const newVisit = visitLeads.filter((l) => !l.activities || l.activities.length === 0).length;
  const repeatVisit = visitLeads.filter((l) => l.activities && l.activities.length > 0).length;
  const totalVisit = fieldVisitLeads;
  const totalCalls = coldCallLeads;

  // Avg Visit = totalVisit / number of days in range (min 1)
  let daySpan = 1;
  if (startDate && endDate) {
    daySpan = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
  }
  const avgVisit = totalVisit > 0 ? +(totalVisit / daySpan).toFixed(2) : 0;

  // ── Monthly buckets (always last 6 months, ignores date filter) ───────────
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyLeads = await Lead.aggregate([
    {
      $match: {
        assignedTo: req.user._id,
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        totalVisit: { $sum: { $cond: [{ $eq: ["$leadSource", "Field Visit"] }, 1, 0] } },
        totalCalls: { $sum: { $cond: [{ $eq: ["$leadSource", "Cold Call"] }, 1, 0] } },
        totalLeads: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0] } },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyStats = monthlyLeads.map((m) => ({
    label: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
    totalVisit: m.totalVisit,
    totalCalls: m.totalCalls,
    totalLeads: m.totalLeads,
    converted: m.converted,
    newVisit: m.totalLeads - m.converted,
  }));

  const conversionRate = totalAssigned > 0 ? Math.round((converted / totalAssigned) * 100) : 0;

  // ── Recent leads ─────────────────────────────────────────────────────────
  const recentLeads = await Lead.find(baseQuery)
    .sort({ updatedAt: -1 })
    .limit(8)
    .populate("createdBy", "fullName role territory profileImageUrl");

  res.status(200).json({
    success: true,
    data: {
      zone: myZone,
      dateRange: {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? new Date(endDate.getTime() - 1).toISOString() : null,
      },
      summary: {
        totalAssigned,
        pending,
        converted,
        followUpsToday,
        conversionRate,
        // Visit / Call breakdown
        totalVisit,
        totalCalls,
        newVisit,
        repeatVisit,
        avgVisit,
        // Status-wise
        interested: interestedCount,
        notInterested: notInterestedCount,
      },
      monthlyStats,
      recentLeads: recentLeads.map(formatLead),
    },
  });
});

exports.getLeads = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const location = String(req.query.location || "").trim();
  const category = String(req.query.category || "").trim();
  const status = String(req.query.status || "").trim().toUpperCase();
  const subStatus = String(req.query.subStatus || "").trim();
  const clientType = String(req.query.clientType || "").trim();
  const projection = String(req.query.projection || "").trim();
  const dateRange = String(req.query.date || "").trim().toLowerCase();
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const query = { assignedTo: req.user._id };

  if (status) {
    if (!LEAD_STATUSES.includes(status)) {
      throw createHttpError(400, "Invalid status filter.");
    }
    query.status = status;
  }

  if (category) {
    query.businessCategory = category;
  }

  if (subStatus) {
    const subStatusRegex = new RegExp(subStatus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.subStatus = subStatusRegex;
  }

  if (clientType) {
    query.clientType = clientType;
  }

  if (projection) {
    query.projection = projection;
  }

  if (search) {
    const safeRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { companyName: safeRegex },
      { contactName: safeRegex },
      { phone: safeRegex },
      { leadCode: safeRegex },
    ];
  }

  if (location) {
    const locRegex = new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        { $or: [{ city: locRegex }, { state: locRegex }, { address: locRegex }] }
      ];
      delete query.$or;
    } else {
      query.$or = [
        { city: locRegex },
        { state: locRegex },
        { address: locRegex },
      ];
    }
  }

  // Custom date range or predefined range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  } else {
    const createdAtFilter = buildDateFilter(dateRange);
    if (createdAtFilter) {
      query.createdAt = createdAtFilter;
    }
  }

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate("createdBy", "fullName role territory profileImageUrl")
      .populate("assignedBy", "fullName role")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: leads.map(formatLead),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

exports.updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const nextStatus = String(status || "").trim().toUpperCase();
  const ALLOWED_STATUSES = ["CONTACTED", "FOLLOW_UP", "QUALIFIED", "CONVERTED", "LOST", "REJECTED"];

  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    throw createHttpError(400, `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`);
  }

  const lead = await Lead.findById(id).populate("createdBy", "territory");
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only update leads assigned to you.");
  }

  const leadZone = inferZoneFromTerritory(lead.createdBy?.territory);
  const fseZone = getUserZone(req.user);
  if (!leadZone || !fseZone || leadZone !== fseZone) {
    throw createHttpError(403, "Lead zone does not match your assigned zone.");
  }

  lead.status = nextStatus;
  lead.updatedBy = req.user._id;
  lead.lastContactedAt = new Date();

  if (nextStatus === "CONVERTED") {
    lead.convertedAt = new Date();
  }

  await lead.save();
  const updatedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName role territory profileImageUrl")
    .populate("assignedBy", "fullName role");

  res.status(200).json({
    success: true,
    message: "Lead status updated",
    data: formatLead(updatedLead),
  });
});

exports.updateLeadProjection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { projection } = req.body;

  if (!PROJECTION_VALUES.includes(projection)) {
    throw createHttpError(400, "Invalid projection value.");
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only update leads assigned to you.");
  }

  lead.projection = projection;
  lead.updatedBy = req.user._id;
  await lead.save();

  const updatedLead = await Lead.findById(id)
    .populate("createdBy", "fullName role territory profileImageUrl")
    .populate("assignedBy", "fullName role");

  res.status(200).json({
    success: true,
    message: "Projection updated successfully.",
    data: formatLead(updatedLead),
  });
});

exports.logLeadActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { outcome, notes, subStatus, nextFollowUpAt, activityIndex, date, interactionMode } = req.body;

  if (!outcome || !notes) {
    throw createHttpError(400, "Outcome and notes are required fields");
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only log activities for leads assigned to you.");
  }

  const activityData = {
    outcome: String(outcome).trim(),
    notes: String(notes).trim(),
    subStatus: subStatus ? String(subStatus).trim() : "",
    interactionMode: interactionMode || "Call",
    nextFollowUpAt: nextFollowUpAt || null,
    date: date ? new Date(date) : new Date(),
  };

  if (activityIndex !== undefined && activityIndex !== null) {
    if (!lead.activities[activityIndex]) {
      throw createHttpError(404, "Activity not found");
    }

    lead.activities[activityIndex] = {
      ...lead.activities[activityIndex].toObject(),
      ...activityData,
      date: lead.activities[activityIndex].date,
    };
  } else {
    lead.activities.push(activityData);
  }

  if (nextFollowUpAt) {
    lead.nextFollowUpAt = nextFollowUpAt;
  }
  if (subStatus) {
    lead.subStatus = String(subStatus).trim();
  }
  lead.lastContactedAt = new Date();
  lead.updatedBy = req.user._id;

  await lead.save();

  res.status(200).json({
    success: true,
    data: formatLead(lead),
  });
});

exports.deleteLeadActivity = asyncHandler(async (req, res) => {
  const { id, index } = req.params;

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only delete activities for leads assigned to you.");
  }

  if (!lead.activities[index]) {
    throw createHttpError(404, "Activity not found");
  }

  lead.activities.splice(index, 1);
  lead.updatedBy = req.user._id;
  await lead.save();

  res.status(200).json({
    success: true,
    data: formatLead(lead),
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: String(req.user._id),
      fullName: req.user.fullName,
      email: req.user.email,
      role: "FSE",
      zone: getUserZone(req.user),
      state: getUserState(req.user),
      phone: req.user.phone || "",
      department: req.user.department || "Field Sales",
      profileImage: req.user.profileImageUrl || "",
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
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
      role: "FSE",
      zone: getUserZone(user),
      state: getUserState(user),
      phone: user.phone || "",
      department: user.department || "Field Sales",
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const input = normalizeCreateLeadInput(req.body, req.user);

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only update leads assigned to you.");
  }

  // Update fields
  const previousStatus = lead.status;
  
  lead.contactName = input.contactName;
  lead.companyName = input.companyName;
  lead.phone = input.phone;
  lead.alternatePhone = input.alternatePhone;
  lead.email = input.email;
  lead.contacts = input.contacts;
  lead.businessCategory = input.businessCategory;
  lead.leadSource = input.leadSource;
  lead.priority = input.priority;
  lead.city = input.city;
  lead.state = input.state;
  lead.address = input.address;
  lead.pincode = input.pincode;
  lead.employeeCount = input.employeeCount;
  lead.reference = input.reference;
  lead.notes = input.notes;
  lead.sourcingDate = input.sourcingDate;
  lead.projection = input.projection;
  lead.clientType = input.clientType;
  lead.sourcedBy = input.sourcedBy;
  lead.nextFollowUpAt = input.nextFollowUpAt;
  lead.updatedBy = req.user._id;

  // Handle status update if provided and different
  if (input.status && input.status !== previousStatus) {
    lead.status = input.status;
    lead.lastContactedAt = new Date();
    if (input.status === "CONVERTED") {
      lead.convertedAt = new Date();
    }
  }

  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName role territory profileImageUrl")
    .populate("assignedBy", "fullName role")
    .populate("assignedTo", "fullName role profileImageUrl");

  res.status(200).json({
    success: true,
    message: "Lead updated successfully",
    data: formatLead(updatedLead),
  });
});

exports.getTransferCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Lead.findById(id).populate("createdBy", "territory");
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only view transfer candidates for leads assigned to you.");
  }

  const leadZone = inferZoneFromTerritory(lead.createdBy?.territory);
  const leadState = lead.state;

  if (!leadZone || !leadState) {
    throw createHttpError(400, "Lead zone or state is missing.");
  }

  const stateManager = await CrmUser.findOne({
    role: "STATE_MANAGER",
    territory: leadZone,
    state: leadState,
    isActive: true,
  });

  if (!stateManager) {
    throw createHttpError(404, `No active State Manager found for ${leadState} in ${leadZone} zone.`);
  }

  res.status(200).json({
    success: true,
    data: {
      id: String(stateManager._id),
      fullName: stateManager.fullName,
      role: stateManager.role,
      territory: stateManager.territory,
      state: stateManager.state,
    },
  });
});

exports.transferLeadToSM = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Lead.findById(id).populate("createdBy", "territory");
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (String(lead.assignedTo) !== String(req.user._id)) {
    throw createHttpError(403, "You can only transfer leads assigned to you.");
  }

  if (lead.status !== "CONVERTED") {
    throw createHttpError(400, "Only converted leads can be transferred to State Manager.");
  }

  const leadZone = inferZoneFromTerritory(lead.createdBy?.territory);
  const leadState = lead.state;

  if (!leadZone || !leadState) {
    throw createHttpError(400, "Lead zone or state is missing.");
  }

  const stateManager = await CrmUser.findOne({
    role: "STATE_MANAGER",
    territory: leadZone,
    state: leadState,
    isActive: true,
  });

  if (!stateManager) {
    throw createHttpError(404, `No active State Manager found for ${leadState} in ${leadZone} zone.`);
  }

  const { tnc } = req.body;

  lead.isForwardedToSM = true;
  lead.approvalStatus = "PENDING";
  lead.approvalLevel = "STATE_MANAGER";
  lead.approvalRequestedBy = req.user._id;
  lead.approvalRequestedAt = new Date();
  lead.assignedBy = req.user._id;
  lead.assignedTo = stateManager._id;
  lead.updatedBy = req.user._id;

  if (tnc) {
    lead.tnc = String(tnc).trim();
  }

  await lead.save();

  res.status(200).json({
    success: true,
    message: "Lead transferred to State Manager successfully",
    data: formatLead(lead),
  });
});

exports.getNonVisitDays = asyncHandler(async (req, res) => {
  const days = await NonVisitDay.find({ fse: req.user._id }).sort({ date: 1 });

  res.status(200).json({
    success: true,
    data: days,
  });
});

exports.addNonVisitDay = asyncHandler(async (req, res) => {
  const { date, type, remarks } = req.body;

  if (!date || !remarks) {
    throw createHttpError(400, "Date and remarks are required.");
  }

  // Normalize date to start of day
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // Check for existing entry
  const existing = await NonVisitDay.findOne({
    fse: req.user._id,
    date: normalizedDate,
  });

  if (existing) {
    throw createHttpError(400, "A non-visit day entry already exists for this date.");
  }

  const nonVisitDay = await NonVisitDay.create({
    fse: req.user._id,
    date: normalizedDate,
    type: type || "FULL_DAY",
    remarks: String(remarks).trim(),
  });

  res.status(201).json({
    success: true,
    message: "Non-visit day added successfully.",
    data: nonVisitDay,
  });
});

exports.deleteNonVisitDay = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const day = await NonVisitDay.findById(id);
  if (!day) {
    throw createHttpError(404, "Entry not found.");
  }

  if (String(day.fse) !== String(req.user._id)) {
    throw createHttpError(403, "You can only delete your own entries.");
  }

  await day.deleteOne();

  res.status(200).json({
    success: true,
    message: "Entry deleted successfully.",
  });
});
