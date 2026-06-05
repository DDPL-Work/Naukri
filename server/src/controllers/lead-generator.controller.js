const asyncHandler = require("../middleware/async.middleware");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CrmUser = require("../models/CrmUser");
const Lead = require("../models/Lead");
const ClientIntake = require("../models/ClientIntake");
const {
  CANONICAL_ZONES,
  normalizeZoneInput,
  normalizeIndianStateInput,
  inferZoneFromTerritory,
  getZoneStates,
  isValidStateForZone,
  buildZoneRegex,
} = require("../utils/zone.util");
const {
  BUSINESS_CATEGORIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
} = require("../constants/lead-generator.constants");
const { replaceCrmProfileImage } = require("../services/profile-image-storage.service");
const { uploadClientJdFile } = require("../services/client-intake-storage.service");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 80;
const FULL_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_CLIENT_PAGE_LIMIT = 10;
const MAX_CLIENT_PAGE_LIMIT = 50;
const CLIENT_INTAKE_STATUSES = ["NEW", "IN_REVIEW", "CONTACTED", "CLOSED"];
const CLIENT_SUBMISSION_MODES = ["MANUAL", "UPLOAD_JD", "BOTH"];
const MAX_CLIENT_JD_FILES = 5;
const COMPANY_NAME_MIN_LENGTH = 2;
const COMPANY_NAME_MAX_LENGTH = 120;
const ROLE_TITLE_MAX_LENGTH = 120;
const ROLE_DESCRIPTION_MAX_LENGTH = 2000;
const BUDGET_MAX_LENGTH = 120;

const generateToken = (id) =>
  jwt.sign({ id, type: "CRM_PANEL" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseEnum = (value, allowedValues, fallback) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
};

const ALLOWED_DATE_FILTERS = ["today", "yesterday", "this_week", "this_month"];

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

const getUserZone = (user = {}) =>
  normalizeZoneInput(user.territory) || inferZoneFromTerritory(user.territory);

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

const buildTerritoryFilter = (zone = "") => {
  const regex = buildZoneRegex(zone);
  if (!regex) {
    return {};
  }

  return { territory: regex };
};

const buildDateFilter = (date = "") => {
  const normalized = String(date || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (normalized === "today") {
    return { $gte: startOfToday };
  }

  if (normalized === "yesterday") {
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    return { $gte: startOfYesterday, $lt: startOfToday };
  }

  if (normalized === "this_week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    return { $gte: startOfWeek };
  }

  if (normalized === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { $gte: startOfMonth };
  }

  return null;
};

const normalizeClientEmail = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw createHttpError(400, "Enter a valid email address.");
  }

  return normalized;
};

const normalizeClientTextField = (
  value = "",
  { label, min = 0, max = 0, required = false, collapse = true } = {},
) => {
  const normalizedRaw = String(value || "").trim();
  const normalized = collapse ? normalizedRaw.replace(/\s+/g, " ") : normalizedRaw;

  if (!normalized) {
    if (required) {
      throw createHttpError(400, `${label} is required.`);
    }
    return "";
  }

  if (min && normalized.length < min) {
    throw createHttpError(400, `${label} must be at least ${min} characters.`);
  }

  if (max && normalized.length > max) {
    throw createHttpError(400, `${label} must be ${max} characters or fewer.`);
  }

  return normalized;
};

const normalizeClientPhone = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  throw createHttpError(400, "Phone number must contain exactly 10 digits.");
};

const normalizeClientPageOptions = (page = 1, limit = DEFAULT_CLIENT_PAGE_LIMIT) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const requestedLimit = Number.parseInt(limit, 10) || DEFAULT_CLIENT_PAGE_LIMIT;
  const safeLimit = Math.min(MAX_CLIENT_PAGE_LIMIT, Math.max(1, requestedLimit));

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const buildClientReferenceId = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CLI-${stamp}-${suffix}`;
};

const formatClientIntake = (intake = {}) => ({
  id: String(intake._id || ""),
  referenceId: intake.referenceId || "",
  companyName: intake.companyName || "",
  email: intake.email || "",
  phone: intake.phone || "",
  roleTitle: intake.roleTitle || "",
  roleDescription: intake.roleDescription || "",
  budget: intake.budget || "",
  submissionMode: intake.submissionMode || "MANUAL",
  status: intake.status || "NEW",
  jdAttachmentCount: Array.isArray(intake.jdAttachments) ? intake.jdAttachments.length : 0,
  jdAttachments: Array.isArray(intake.jdAttachments)
    ? intake.jdAttachments.map((item) => ({
        fileName: item.fileName || "",
        url: item.url || "",
        mimeType: item.mimeType || "",
        sizeBytes: Number(item.sizeBytes || 0),
        uploadedAt: item.uploadedAt || null,
      }))
    : [],
  qrToken: intake.qrToken || "",
  createdAt: intake.createdAt || null,
  updatedAt: intake.updatedAt || null,
});

const getAvailableZonesForFilter = async (baseFilter, user) => {
  const creatorIds = await Lead.distinct("createdBy", baseFilter);
  if (!creatorIds.length) {
    const fallbackZone = normalizeZoneInput(user?.territory) || inferZoneFromTerritory(user?.territory);
    return fallbackZone ? [fallbackZone] : [];
  }

  const creators = await CrmUser.find({ _id: { $in: creatorIds } }).select("territory");
  const zoneSet = new Set();

  creators.forEach((creator) => {
    const zone = normalizeZoneInput(creator.territory) || inferZoneFromTerritory(creator.territory);
    if (zone) {
      zoneSet.add(zone);
    }
  });

  if (!zoneSet.size) {
    const fallbackZone = normalizeZoneInput(user?.territory) || inferZoneFromTerritory(user?.territory);
    if (fallbackZone) {
      zoneSet.add(fallbackZone);
    }
  }

  return CANONICAL_ZONES.filter((zone) => zoneSet.has(zone));
};

const applyCreatedByZoneFilter = async (filters, zone) => {
  if (!zone) {
    return;
  }

  const zoneRegex = buildZoneRegex(zone);
  if (!zoneRegex) {
    return;
  }

  const zoneCreatorIds = await CrmUser.find({ territory: { $regex: zoneRegex } }).distinct("_id");
  const zoneCreatorIdSet = new Set(zoneCreatorIds.map((id) => String(id)));

  if (filters.createdBy && filters.createdBy.$in && Array.isArray(filters.createdBy.$in)) {
    filters.createdBy = {
      $in: filters.createdBy.$in.filter((id) => zoneCreatorIdSet.has(String(id))),
    };
    return;
  }

  if (filters.createdBy) {
    if (!zoneCreatorIdSet.has(String(filters.createdBy))) {
      filters.createdBy = { $in: [] };
    }
    return;
  }

  filters.createdBy = { $in: zoneCreatorIds };
};

const normalizeLeadContacts = (payload = {}) => {
  const incomingContacts = Array.isArray(payload.contacts) ? payload.contacts : [];
  const normalizedContacts = incomingContacts
    .map((contact) => ({
      fullName: String(contact?.fullName || contact?.contactName || "").trim(),
      phone: String(contact?.phone || contact?.phoneNumber || "").trim(),
      email: String(contact?.email || "").trim().toLowerCase(),
      designation: String(contact?.designation || "").trim(),
      isPrimary: Boolean(contact?.isPrimary),
    }))
    .filter((contact) => contact.fullName || contact.phone || contact.email);

  if (!normalizedContacts.length) {
    const fallbackContact = {
      fullName: String(payload.contactName || payload.fullName || "").trim(),
      phone: String(payload.phone || payload.phoneNumber || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      isPrimary: true,
    };

    if (fallbackContact.fullName || fallbackContact.phone || fallbackContact.email) {
      normalizedContacts.push(fallbackContact);
    }
  }

  if (!normalizedContacts.length) {
    return [];
  }

  const primaryIndex = normalizedContacts.findIndex((contact) => contact.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return normalizedContacts.map((contact, index) => ({
    fullName: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    designation: contact.designation,
    isPrimary: index === resolvedPrimaryIndex,
  }));
};

const normalizeCreateLeadInput = (payload = {}, user = {}) => {
  const normalizedUserState = normalizeIndianStateInput(user.state);
  const normalizedPayloadState = normalizeIndianStateInput(payload.state);
  const contacts = normalizeLeadContacts(payload);
  const primaryContact = contacts.find((contact) => contact.isPrimary) || contacts[0] || {};

  return {
    contactName: String(payload.contactName || payload.fullName || primaryContact.fullName || "").trim(),
    companyName: String(payload.companyName || "").trim(),
    phone: String(payload.phone || payload.phoneNumber || primaryContact.phone || "").trim(),
    alternatePhone: String(payload.alternatePhone || "").trim(),
    email: String(payload.email || primaryContact.email || "").trim().toLowerCase(),
    contacts,
    businessCategory: String(payload.businessCategory || "").trim(),
    leadSource: String(payload.leadSource || "").trim(),
    status: parseEnum(payload.status, LEAD_STATUSES, "NEW"),
    priority: parseEnum(payload.priority, LEAD_PRIORITIES, "MEDIUM"),
    city: String(payload.city || "").trim() || "Unknown",
    state: normalizedUserState || normalizedPayloadState || "Unknown",
    address: String(payload.address || payload.location || "").trim(),
    pincode: String(payload.pincode || "").trim(),
    notes: String(payload.notes || "").trim(),
    nextFollowUpAt: payload.nextFollowUpAt || null,
    sourcingDate: payload.sourcingDate || null,
    isStartup: Boolean(payload.isStartup),
    masterUnion: String(payload.masterUnion || "").trim(),
    subStatus: String(payload.subStatus || "").trim(),
    franchiseStatus: String(payload.franchiseStatus || "").trim(),
    employeeCount: String(payload.employeeCount || "").trim(),
  };
};

const normalizeActivityContactInput = (contact = {}) => ({
  fullName: String(contact?.fullName || contact?.contactName || "").trim(),
  phone: Lead.normalizePhoneNumber(String(contact?.phone || "")),
  email: String(contact?.email || "").trim().toLowerCase(),
});

const getLeadContactsForActivity = (lead = {}) => {
  const normalizedContacts = (Array.isArray(lead.contacts) ? lead.contacts : [])
    .map((contact) => normalizeActivityContactInput(contact))
    .filter((contact) => contact.fullName || contact.phone || contact.email);

  if (normalizedContacts.length) {
    return normalizedContacts;
  }

  const fallbackContact = normalizeActivityContactInput({
    fullName: lead.contactName,
    phone: lead.phone,
    email: lead.email,
  });

  return fallbackContact.fullName || fallbackContact.phone || fallbackContact.email ? [fallbackContact] : [];
};

const pickActivityContact = ({ lead, incomingContact, existingActivityContact }) => {
  const leadContacts = getLeadContactsForActivity(lead);
  const normalizedIncoming = normalizeActivityContactInput(incomingContact);
  const normalizedExisting = normalizeActivityContactInput(existingActivityContact);
  const hasIncoming = normalizedIncoming.fullName || normalizedIncoming.phone || normalizedIncoming.email;

  if (hasIncoming) {
    const matchedContact = leadContacts.find((leadContact) => {
      if (normalizedIncoming.phone) {
        return leadContact.phone === normalizedIncoming.phone;
      }

      if (normalizedIncoming.email) {
        return leadContact.email === normalizedIncoming.email;
      }

      return (
        normalizedIncoming.fullName &&
        String(leadContact.fullName || "").toLowerCase() === normalizedIncoming.fullName.toLowerCase()
      );
    });

    if (!matchedContact) {
      throw createHttpError(400, "Selected contact does not belong to this lead.");
    }

    return matchedContact;
  }

  if (normalizedExisting.fullName || normalizedExisting.phone || normalizedExisting.email) {
    return normalizedExisting;
  }

  return leadContacts[0] || null;
};

const buildLeadAccessFilter = (user) => {
  if (!user) {
    return {};
  }

  if (["ADMIN", "APPROVER"].includes(user.role)) {
    return {};
  }

  if (user.role === "STATE_MANAGER") {
    if (!user.state?.trim()) {
      return { _id: null };
    }

    return {
      state: {
        $regex: `^${escapeRegExp(user.state.trim())}$`,
        $options: "i",
      },
    };
  }

  return { createdBy: user._id };
};

const formatLead = (lead) => ({
  id: String(lead._id),
  leadCode: lead.leadCode,
  contactName: lead.contactName,
  companyName: lead.companyName,
  phone: lead.phone,
  alternatePhone: lead.alternatePhone || "",
  email: lead.email || "",
  contacts:
    Array.isArray(lead.contacts) && lead.contacts.length
      ? lead.contacts.map((contact) => ({
          fullName: contact.fullName || "",
          phone: contact.phone || "",
          email: contact.email || "",
          designation: contact.designation || "",
          isPrimary: Boolean(contact.isPrimary),
        }))
      : [
          {
            fullName: lead.contactName || "",
            phone: lead.phone || "",
            email: lead.email || "",
            isPrimary: true,
          },
        ],
  businessCategory: lead.businessCategory,
  leadSource: lead.leadSource,
  status: lead.isForwardedToSM ? "FORWARDED" : lead.status,
  priority: lead.priority,
  city: lead.city,
  state: lead.state,
  address: lead.address || "",
  pincode: lead.pincode || "",
  notes: lead.notes || "",
  sourcingDate: lead.sourcingDate || null,
  isStartup: Boolean(lead.isStartup),
  masterUnion: lead.masterUnion || "",
  subStatus: lead.subStatus || "",
  franchiseStatus: lead.franchiseStatus || "",
  employeeCount: lead.employeeCount || "",
  nextFollowUpAt: lead.nextFollowUpAt,
  lastContactedAt: lead.lastContactedAt,
  activities: (Array.isArray(lead.activities) ? lead.activities : []).map((activity) => {
    const fallbackContact = {
      fullName: lead.contactName || "",
      phone: lead.phone || "",
      email: lead.email || "",
    };
    const normalizedContact = normalizeActivityContactInput(activity?.contact || fallbackContact);

    return {
      outcome: activity?.outcome || "",
      notes: activity?.notes || "",
      subStatus: activity?.subStatus || "",
      interactionMode: activity?.interactionMode || "Call",
      franchiseStatus: activity?.franchiseStatus || "",
      nextFollowUpAt: activity?.nextFollowUpAt || null,
      date: activity?.date || null,
      contact:
        normalizedContact.fullName || normalizedContact.phone || normalizedContact.email
          ? normalizedContact
          : fallbackContact,
    };
  }),
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  createdBy:
    lead.createdBy && typeof lead.createdBy === "object"
      ? {
          id: String(lead.createdBy._id),
          fullName: lead.createdBy.fullName,
          role: lead.createdBy.role,
          profileImage: lead.createdBy.profileImageUrl || "",
          zone:
            normalizeZoneInput(lead.createdBy.territory) ||
            inferZoneFromTerritory(lead.createdBy.territory) ||
            "",
        }
      : null,
  assignedTo:
    lead.assignedTo && typeof lead.assignedTo === "object"
      ? {
          id: String(lead.assignedTo._id),
          fullName: lead.assignedTo.fullName,
          role: lead.assignedTo.role,
          profileImage: lead.assignedTo.profileImageUrl || "",
        }
      : null,
});

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

  const normalizedPhone = Lead.normalizePhoneNumber(payload.phone);
  if (normalizedPhone.length < 10) {
    throw createHttpError(400, "Phone number must contain at least 10 digits");
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email).trim())) {
    throw createHttpError(400, "Enter a valid email address");
  }

  if (!Array.isArray(payload.contacts) || !payload.contacts.length) {
    throw createHttpError(400, "At least one contact person is required.");
  }

  const seenPhones = new Set();
  const seenEmails = new Set();

  payload.contacts.forEach((contact = {}, index) => {
    const label = `Contact ${index + 1}`;
    const contactName = String(contact.fullName || "").trim();
    const contactPhone = String(contact.phone || "").trim();
    const contactEmail = String(contact.email || "").trim().toLowerCase();

    if (!contactName) {
      throw createHttpError(400, `${label}: Full name is required.`);
    }

    if (!contactPhone) {
      throw createHttpError(400, `${label}: Phone number is required.`);
    }

    const normalizedContactPhone = Lead.normalizePhoneNumber(contactPhone);
    if (normalizedContactPhone.length < 10) {
      throw createHttpError(400, `${label}: Phone number must contain at least 10 digits.`);
    }

    if (seenPhones.has(normalizedContactPhone)) {
      throw createHttpError(400, `${label}: Duplicate phone number is not allowed.`);
    }
    seenPhones.add(normalizedContactPhone);

    if (contactEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        throw createHttpError(400, `${label}: Enter a valid email address.`);
      }

      if (seenEmails.has(contactEmail)) {
        throw createHttpError(400, `${label}: Duplicate email is not allowed.`);
      }
      seenEmails.add(contactEmail);
    }
  });
};

exports.submitClientIntake = asyncHandler(async (req, res) => {
  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const {
    companyName = "",
    email = "",
    phone = "",
    roleTitle = "",
    roleDescription = "",
    budget = "",
    qrToken = "",
  } = requestBody;

  const normalizedCompanyName = normalizeClientTextField(companyName, {
    label: "Company name",
    min: COMPANY_NAME_MIN_LENGTH,
    max: COMPANY_NAME_MAX_LENGTH,
    required: true,
  });
  const normalizedEmail = normalizeClientEmail(email);
  const normalizedPhone = normalizeClientPhone(phone);
  const normalizedRoleTitle = normalizeClientTextField(roleTitle, {
    label: "Role title",
    max: ROLE_TITLE_MAX_LENGTH,
  });
  const normalizedRoleDescription = normalizeClientTextField(roleDescription, {
    label: "Role description",
    max: ROLE_DESCRIPTION_MAX_LENGTH,
    collapse: false,
  });
  const normalizedBudget = normalizeClientTextField(budget, {
    label: "Budget",
    max: BUDGET_MAX_LENGTH,
  });
  const normalizedQrToken = String(qrToken || "").trim();
  const files = Array.isArray(req.files) ? req.files.filter(Boolean) : [];

  if (files.length > MAX_CLIENT_JD_FILES) {
    throw createHttpError(400, `You can upload up to ${MAX_CLIENT_JD_FILES} JD files.`);
  }

  if (!normalizedRoleTitle && !files.length) {
    throw createHttpError(400, "Provide either a role title (manual entry) or upload at least one JD file.");
  }

  const referenceId = buildClientReferenceId();
  const uploadedAttachments = files.length
    ? await Promise.all(files.map((file) => uploadClientJdFile(file, referenceId)))
    : [];

  const submissionMode =
    normalizedRoleTitle && uploadedAttachments.length
      ? "BOTH"
      : normalizedRoleTitle
        ? "MANUAL"
        : "UPLOAD_JD";

  const createdIntake = await ClientIntake.create({
    referenceId,
    companyName: normalizedCompanyName,
    email: normalizedEmail,
    phone: normalizedPhone,
    roleTitle: normalizedRoleTitle,
    roleDescription: normalizedRoleDescription,
    budget: normalizedBudget,
    jdAttachments: uploadedAttachments,
    submissionMode,
    qrToken: normalizedQrToken,
    sourcePath: String(req.originalUrl || "").trim(),
    sourceIp: String(req.ip || "").trim(),
    sourceUserAgent: String(req.get("user-agent") || "").trim(),
    status: "NEW",
  });

  res.status(201).json({
    success: true,
    referenceId: createdIntake.referenceId,
    message: "Client role posting submitted successfully.",
    data: formatClientIntake(createdIntake),
  });
});

exports.getClientIntakes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = normalizeClientPageOptions(req.query.page, req.query.limit);
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim().toUpperCase();
  const submissionMode = String(req.query.submissionMode || "").trim().toUpperCase();

  const query = {};

  if (search) {
    const safeRegex = { $regex: escapeRegExp(search), $options: "i" };
    query.$or = [
      { referenceId: safeRegex },
      { companyName: safeRegex },
      { email: safeRegex },
      { phone: { $regex: escapeRegExp(search) } },
      { roleTitle: safeRegex },
    ];
  }

  if (status) {
    if (!CLIENT_INTAKE_STATUSES.includes(status)) {
      throw createHttpError(400, `Invalid status filter. Allowed: ${CLIENT_INTAKE_STATUSES.join(", ")}`);
    }
    query.status = status;
  }

  if (submissionMode) {
    if (!CLIENT_SUBMISSION_MODES.includes(submissionMode)) {
      throw createHttpError(
        400,
        `Invalid submissionMode filter. Allowed: ${CLIENT_SUBMISSION_MODES.join(", ")}`,
      );
    }
    query.submissionMode = submissionMode;
  }

  const [items, total] = await Promise.all([
    ClientIntake.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ClientIntake.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: items.map(formatClientIntake),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
});

exports.getLeadGeneratorMeta = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      businessCategories: BUSINESS_CATEGORIES,
      leadSources: LEAD_SOURCES,
      leadStatuses: LEAD_STATUSES,
      leadPriorities: LEAD_PRIORITIES,
      defaultState: req.user.state || "",
    },
  });
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

exports.getLeadGeneratorDashboard = asyncHandler(async (req, res) => {
  const accessFilter = buildLeadAccessFilter(req.user);
  const { startDate, endDate } = req.query;

  const matchFilter = { ...accessFilter };
  if (startDate && endDate) {
    const endObj = new Date(endDate);
    endObj.setHours(23, 59, 59, 999);
    matchFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: endObj,
    };
  }

  const zone = getUserZone(req.user);
  const state = normalizeIndianStateInput(req.user?.state) || "";
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalLeads,
    newLeads,
    contactedLeads,
    wonLeads,
    followUpsToday,
    leadsThisMonth,
    recentLeads,
    upcomingFollowUps,
    statusBreakdown,
    sourceBreakdown,
    categoryBreakdown,
    allCalls,
    interestedClientsList,
  ] = await Promise.all([
    Lead.countDocuments(matchFilter),
    Lead.countDocuments({ ...matchFilter, status: "NEW" }),
    Lead.countDocuments({ ...matchFilter, status: "CONTACTED" }),
    Lead.countDocuments({ ...matchFilter, status: "WON" }),
    Lead.countDocuments({
      ...matchFilter,
      nextFollowUpAt: { $gte: dayStart, $lt: dayEnd },
    }),
    Lead.countDocuments({
      ...matchFilter,
      createdAt: { $gte: monthStart },
    }),
    Lead.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("createdBy", "fullName role profileImageUrl")
      .populate("assignedTo", "fullName role profileImageUrl"),
    Lead.find({
      ...matchFilter,
      nextFollowUpAt: { $gte: dayStart },
    })
      .sort({ nextFollowUpAt: 1 })
      .limit(5)
      .populate("createdBy", "fullName role profileImageUrl")
      .populate("assignedTo", "fullName role profileImageUrl"),
    Lead.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $sort: { value: -1, _id: 1 } },
    ]),
    Lead.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$leadSource", value: { $sum: 1 } } },
      { $sort: { value: -1, _id: 1 } },
      { $limit: 6 },
    ]),
    Lead.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$businessCategory", value: { $sum: 1 } } },
      { $sort: { value: -1, _id: 1 } },
      { $limit: 6 },
    ]),
    Lead.find({ ...matchFilter, "activities.0": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select("leadCode companyName contactName activities"),
    Lead.find({
      ...matchFilter,
      $or: [{ status: "QUALIFIED" }, { priority: "HIGH" }, { subStatus: "INTERESTED" }],
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate("createdBy", "fullName role profileImageUrl"),
  ]);

  const latestCalls = allCalls.reduce((acc, lead) => {
    return acc.concat(lead.activities.map(activity => ({
      ...activity.toObject(),
      leadCode: lead.leadCode,
      companyName: lead.companyName,
    })));
  }, []).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);

  res.status(200).json({
    success: true,
    data: {
      zone,
      state,
      summary: {
        totalLeads,
        newLeads,
        contactedLeads,
        wonLeads,
        followUpsToday,
        leadsThisMonth,
      },
      pipeline: statusBreakdown.map((item) => ({
        label: item._id,
        value: item.value,
      })),
      sourceBreakdown: sourceBreakdown.map((item) => ({
        label: item._id,
        value: item.value,
      })),
      categoryBreakdown: categoryBreakdown.map((item) => ({
        label: item._id,
        value: item.value,
      })),
      recentLeads: recentLeads.map(formatLead),
      upcomingFollowUps: upcomingFollowUps.map(formatLead),
      calls: latestCalls,
      interestedClients: interestedClientsList.map(formatLead),
    },
  });
});

exports.getLeads = asyncHandler(async (req, res) => {
  const accessFilter = buildLeadAccessFilter(req.user);
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const skip = (page - 1) * limit;

  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim().toUpperCase();
  const statusGroup = String(req.query.statusGroup || "").trim().toUpperCase();
  const zone = normalizeZoneInput(req.query.zone);
  const date = String(req.query.date || "").trim().toLowerCase();
  const leadSource = String(req.query.leadSource || "").trim();
  const businessCategory = String(req.query.businessCategory || "").trim();

  if (req.query.zone && !zone) {
    throw createHttpError(
      400,
      `Invalid zone filter. Allowed values: ${CANONICAL_ZONES.join(", ")}`,
    );
  }

  if (date && !ALLOWED_DATE_FILTERS.includes(date)) {
    throw createHttpError(
      400,
      `Invalid date filter. Allowed values: ${ALLOWED_DATE_FILTERS.join(", ")}`,
    );
  }

  const filters = { ...accessFilter };

  if (search) {
    filters.$or = [
      { contactName: { $regex: escapeRegExp(search), $options: "i" } },
      { companyName: { $regex: escapeRegExp(search), $options: "i" } },
      { leadCode: { $regex: escapeRegExp(search), $options: "i" } },
      { phone: { $regex: escapeRegExp(search) } },
      { email: { $regex: escapeRegExp(search), $options: "i" } },
      { "contacts.fullName": { $regex: escapeRegExp(search), $options: "i" } },
      { "contacts.phone": { $regex: escapeRegExp(search) } },
      { "contacts.email": { $regex: escapeRegExp(search), $options: "i" } },
    ];
  }

  if (status && LEAD_STATUSES.includes(status)) {
    filters.status = status;
  }

  if (statusGroup) {
    const statusGroupMap = {
      APPROVED: ["QUALIFIED", "WON"],
      PENDING: ["NEW", "CONTACTED", "FOLLOW_UP"],
      REJECTED: ["LOST"],
    };

    if (statusGroupMap[statusGroup]) {
      filters.status = { $in: statusGroupMap[statusGroup] };
    }
  }

  if (leadSource && LEAD_SOURCES.includes(leadSource)) {
    filters.leadSource = leadSource;
  }

  if (businessCategory && BUSINESS_CATEGORIES.includes(businessCategory)) {
    filters.businessCategory = businessCategory;
  }

  const createdAtFilter = buildDateFilter(date);
  if (createdAtFilter) {
    filters.createdAt = createdAtFilter;
  }

  const filtersForZoneOptions = { ...filters };
  const availableZones = await getAvailableZonesForFilter(filtersForZoneOptions, req.user);
  await applyCreatedByZoneFilter(filters, zone);

  const [items, total] = await Promise.all([
    Lead.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "fullName role profileImageUrl territory")
      .populate("assignedTo", "fullName role profileImageUrl"),
    Lead.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: items.map(formatLead),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        availableZones,
        applied: {
          zone: zone || "",
          date: date || "",
        },
      },
    },
  });
});

exports.createLead = asyncHandler(async (req, res) => {
  const input = normalizeCreateLeadInput(req.body, req.user);
  ensureLeadPayload(input);

  const normalizedPhone = Lead.normalizePhoneNumber(input.phone);
  const normalizedEmail = input.email;
  const contactPhones = Array.from(
    new Set(
      (input.contacts || [])
        .map((contact) => Lead.normalizePhoneNumber(contact.phone))
        .filter((phone) => phone),
    ),
  );
  const contactEmails = Array.from(
    new Set(
      (input.contacts || [])
        .map((contact) => String(contact.email || "").trim().toLowerCase())
        .filter((email) => email),
    ),
  );
  const duplicateConditions = [];

  if (contactPhones.length || normalizedPhone) {
    const phones = Array.from(new Set([normalizedPhone, ...contactPhones].filter(Boolean)));
    duplicateConditions.push({ phone: { $in: phones } });
    duplicateConditions.push({ "contacts.phone": { $in: phones } });
  }

  if (contactEmails.length || normalizedEmail) {
    const emails = Array.from(new Set([normalizedEmail, ...contactEmails].filter(Boolean)));
    duplicateConditions.push({ email: { $in: emails } });
    duplicateConditions.push({ "contacts.email": { $in: emails } });
  }

  const duplicateFilter = duplicateConditions.length
    ? { $or: duplicateConditions }
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
    status: input.status,
    priority: input.priority,
    city: input.city,
    state: input.state,
    address: input.address,
    pincode: input.pincode,
    notes: input.notes,
    nextFollowUpAt: input.nextFollowUpAt,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  const hydratedLead = await Lead.findById(lead._id).populate("createdBy", "fullName role profileImageUrl");

  res.status(201).json({
    success: true,
    data: formatLead(hydratedLead),
  });
});

exports.updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const ALLOWED_STATUSES = ["CONVERTED", "FORWARDED"];

  if (!status || !ALLOWED_STATUSES.includes(String(status).toUpperCase())) {
    throw createHttpError(400, `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`);
  }

  const lead = await Lead.findById(id).populate("createdBy", "territory");

  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  // Only the creator or admin/approver can update the status
  const leadCreatorId = lead.createdBy?._id || lead.createdBy;
  const isOwner = String(leadCreatorId) === String(req.user._id);
  const isPrivileged = ["ADMIN", "APPROVER", "STATE_MANAGER"].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    throw createHttpError(403, "You do not have permission to update this lead");
  }

  if (String(status).toUpperCase() === "FORWARDED") {
    const leadState = normalizeIndianStateInput(lead.state) || normalizeIndianStateInput(req.user.state);
    if (!leadState) {
      throw createHttpError(
        409,
        "Lead state is missing or invalid. Update the lead state before forwarding.",
      );
    }

    const leadZone = normalizeZoneInput(lead.createdBy?.territory) || inferZoneFromTerritory(lead.createdBy?.territory);
    if (!leadZone || !isValidStateForZone(leadState, leadZone)) {
      throw createHttpError(409, "Unable to resolve a valid zone/state mapping for this lead.");
    }

    const assignedStateManager = await CrmUser.findOne({
      role: "STATE_MANAGER",
      ...buildTerritoryFilter(leadZone),
      state: leadState,
      accessStatus: "ACTIVE",
      isActive: true,
    }).select("_id");

    if (!assignedStateManager) {
      throw createHttpError(
        409,
        `No active State Manager found for ${leadState}, ${leadZone} Zone.`,
      );
    }

    lead.state = leadState;
    lead.assignedTo = assignedStateManager._id;
    lead.assignedBy = req.user._id;
    lead.isForwardedToSM = true;
  }
  
  lead.status = String(status).toUpperCase();
  lead.updatedBy = req.user._id;
  await lead.save();

  const updated = await Lead.findById(lead._id).populate("createdBy", "fullName role profileImageUrl");

  res.status(200).json({
    success: true,
    data: formatLead(updated),
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
    throw createHttpError(400, "Valid zone is required (North, South, East, West).");
  }

  const normalizedState = normalizeIndianStateInput(state);
  if (!normalizedState || !isValidStateForZone(normalizedState, normalizedZone)) {
    throw createHttpError(400, "Selected state is not valid for the selected zone.");
  }

  const normalizedFullName = normalizeFullName(fullName);
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await CrmUser.findOne({ email: normalizedEmail });
  
  if (existingUser) {
    throw createHttpError(409, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    password: hashedPassword,
    role: "LEAD_GENERATOR",
    territory: normalizedZone,
    state: normalizedState,
    accessStatus: "ACTIVE",
    isActive: true,
  });

  const tokenPair = await issueTokenPair({ user, source: "CRM", req });
  setRefreshCookie(res, tokenPair.refreshToken);

  res.status(201).json({
    success: true,
    message: "Registration successful. You can now log in.",
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
    throw createHttpError(400, "All fields are required (email, zone, password)");
  }

  const normalizedZone = normalizeZoneInput(zone);
  if (!normalizedZone) {
    throw createHttpError(400, "Valid zone is required (North, South, East, West).");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await CrmUser.findOne({ email: normalizedEmail });

  if (!user) {
    throw createHttpError(401, "Invalid credentials or zone");
  }

  if (!hasDesignation(user, "LEAD_GENERATOR")) {
    throw createHttpError(403, "Access denied. Only Lead Generators can log in here.");
  }

  if (inferZoneFromTerritory(user.territory) !== normalizedZone) {
    throw createHttpError(401, "Invalid zone selection for this account.");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Account is inactive or restricted.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials or zone");
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
      state: normalizeIndianStateInput(user.state) || "",
      role: "LEAD_GENERATOR",
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

exports.getProfile = asyncHandler(async (req, res) => {
  const zone = getUserZone(req.user) || "";
  const state = normalizeIndianStateInput(req.user.state) || "";
  res.status(200).json({
    success: true,
    data: {
      id: String(req.user._id),
      fullName: req.user.fullName,
      email: req.user.email,
      role: "LEAD_GENERATOR",
      zone,
      state,
      phone: req.user.phone || "",
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

  const zone = normalizeZoneInput(user.territory) || inferZoneFromTerritory(user.territory) || "";
  const state = normalizeIndianStateInput(user.state) || "";

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: "LEAD_GENERATOR",
      zone,
      state,
      phone: user.phone || "",
      profileImage: user.profileImageUrl || "",
    },
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

  const zone = normalizeZoneInput(user.territory) || inferZoneFromTerritory(user.territory) || "";
  const state = normalizeIndianStateInput(user.state) || "";

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully.",
    data: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: "LEAD_GENERATOR",
      zone,
      state,
      profileImage: user.profileImageUrl || "",
    },
  });
});

exports.logLeadActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { outcome, notes, subStatus, franchiseStatus, nextFollowUpAt, activityIndex, contact } = req.body;

  if (!outcome || !notes) {
    throw createHttpError(400, "Outcome and notes are required");
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  const existingActivity =
    activityIndex !== undefined && activityIndex !== null ? lead.activities[activityIndex] : null;
  const selectedContact = pickActivityContact({
    lead,
    incomingContact: contact,
    existingActivityContact: existingActivity?.contact,
  });

  const activityData = {
    outcome: String(outcome).trim(),
    notes: String(notes).trim(),
    subStatus: subStatus ? String(subStatus).trim() : "",
    franchiseStatus: franchiseStatus ? String(franchiseStatus).trim() : "",
    nextFollowUpAt: nextFollowUpAt || null,
    contact: selectedContact,
    date: new Date(),
  };

  if (activityIndex !== undefined && activityIndex !== null) {
    // Update existing activity
    if (!lead.activities[activityIndex]) {
      throw createHttpError(404, "Activity not found");
    }
    lead.activities[activityIndex] = {
      ...lead.activities[activityIndex].toObject(),
      ...activityData,
      date: lead.activities[activityIndex].date, // Keep original date
    };
  } else {
    // Add new activity
    lead.activities.push(activityData);
  }

  // Also update lead's main follow-up date and last contacted date
  if (nextFollowUpAt) {
    lead.nextFollowUpAt = nextFollowUpAt;
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

exports.addLeadContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, email, designation, isPrimary } = req.body;

  if (!fullName || !phone) {
    throw createHttpError(400, "Full name and phone are required for a contact.");
  }

  const normalizedPhone = Lead.normalizePhoneNumber(phone);
  if (normalizedPhone.length < 10) {
    throw createHttpError(400, "Phone number must contain at least 10 digits.");
  }

  let normalizedEmail = "";
  if (email) {
    normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw createHttpError(400, "Enter a valid email address.");
    }
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  // Create robust contacts array
  let existingContacts = Array.isArray(lead.contacts) ? lead.contacts : [];
  if (existingContacts.length === 0) {
     if (lead.contactName || lead.phone || lead.email) {
       existingContacts.push({
         fullName: lead.contactName || "",
         phone: lead.phone || "",
         email: lead.email || "",
         isPrimary: true
       });
     }
  }

  const isDuplicateContact = existingContacts.some(c => 
    (normalizedPhone && c.phone === normalizedPhone) || 
    (normalizedEmail && c.email === normalizedEmail)
  );

  if (isDuplicateContact) {
    throw createHttpError(400, "A contact with this phone or email already exists for this lead.");
  }

  if (isPrimary) {
     existingContacts = existingContacts.map(c => ({ ...c.toObject ? c.toObject() : c, isPrimary: false }));
     lead.contactName = String(fullName).trim();
     lead.phone = normalizedPhone;
     if (normalizedEmail) lead.email = normalizedEmail;
  }

  existingContacts.push({
    fullName: String(fullName).trim(),
    phone: normalizedPhone,
    email: normalizedEmail,
    designation: String(designation || "").trim(),
    isPrimary: existingContacts.length === 0 ? true : Boolean(isPrimary)
  });

  lead.contacts = existingContacts;
  lead.updatedBy = req.user._id;

  await lead.save();

  res.status(200).json({
    success: true,
    data: formatLead(lead),
  });
});
