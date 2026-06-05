const CrmUser = require("../models/CrmUser");
const Lead = require("../models/Lead");
const asyncHandler = require("../middleware/async.middleware");
const createHttpError = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  CANONICAL_ZONES,
  normalizeZoneInput,
  normalizeIndianStateInput,
  inferZoneFromTerritory,
  isValidStateForZone,
  getAvailableStatesForZone,
  buildZoneRegex,
} = require("../utils/zone.util");
const { replaceCrmProfileImage } = require("../services/profile-image-storage.service");
const {
  issueTokenPair,
  setRefreshCookie,
} = require("../services/auth.service");

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 80;
const FULL_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};
const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getUserZone = (user = {}) => {
  return normalizeZoneInput(user.territory) || inferZoneFromTerritory(user.territory);
};

const getUserState = (user = {}) => {
  return normalizeIndianStateInput(user.state);
};

const buildTerritoryFilter = (zone = "") => {
  const regex = buildZoneRegex(zone);
  if (!regex) {
    return {};
  }

  return { territory: regex };
};

const RESERVED_STATE_MANAGER_STATUSES = ["ACTIVE", "PENDING_INVITE"];
const MANAGED_MEMBER_ROLES = ["LEAD_GENERATOR", "FSE"];
const DEFAULT_TEAM_MEMBER_LIMIT = 10;
const MAX_TEAM_MEMBER_LIMIT = 50;
const TERMINAL_LEAD_STATUSES = ["CONVERTED", "LOST", "REJECTED"];
const FORWARDED_PIPELINE_STATUSES = ["FORWARDED", "ASSIGNED", "CONVERTED", "REJECTED", "LOST"];
const GENERATOR_PENDING_STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "QUALIFIED"];

const getMemberRoleSet = (user = {}) => {
  const roleSet = new Set();
  const primaryRole = String(user.role || "").trim().toUpperCase();
  if (primaryRole) {
    roleSet.add(primaryRole);
  }

  if (Array.isArray(user.designations)) {
    user.designations.forEach((role) => {
      const normalizedRole = String(role || "").trim().toUpperCase();
      if (normalizedRole) {
        roleSet.add(normalizedRole);
      }
    });
  }

  return roleSet;
};

const hasMemberRole = (user = {}, role = "") => {
  const normalizedRole = String(role || "").trim().toUpperCase();
  if (!normalizedRole) {
    return false;
  }
  return getMemberRoleSet(user).has(normalizedRole);
};

const getMemberRoles = (user = {}) => Array.from(getMemberRoleSet(user));

const buildManagedRoleQuery = (role = "") => {
  const normalizedRole = String(role || "").trim().toUpperCase();
  if (!normalizedRole) {
    return { _id: null };
  }

  return {
    $or: [{ role: normalizedRole }, { designations: normalizedRole }],
  };
};

const buildAnyManagedRoleQuery = () => ({
  $or: [{ role: { $in: MANAGED_MEMBER_ROLES } }, { designations: { $in: MANAGED_MEMBER_ROLES } }],
});

const buildStateReservationQuery = (zone = "", state = "", excludedUserId = null) => {
  const normalizedZone = normalizeZoneInput(zone);
  const normalizedState = normalizeIndianStateInput(state);

  if (!normalizedZone || !normalizedState) {
    return null;
  }

  const query = {
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(normalizedZone),
    state: normalizedState,
    accessStatus: { $in: RESERVED_STATE_MANAGER_STATUSES },
  };

  if (excludedUserId) {
    query._id = { $ne: excludedUserId };
  }

  return query;
};

const getReservedStatesForZone = async (zone = "", excludedUserId = null) => {
  const normalizedZone = normalizeZoneInput(zone);
  if (!normalizedZone) {
    return [];
  }

  const query = {
    role: "STATE_MANAGER",
    ...buildTerritoryFilter(normalizedZone),
    accessStatus: { $in: RESERVED_STATE_MANAGER_STATUSES },
  };

  if (excludedUserId) {
    query._id = { $ne: excludedUserId };
  }

  const managers = await CrmUser.find(query).select("state");
  return managers
    .map((item) => normalizeIndianStateInput(item.state))
    .filter(Boolean);
};

const resolvePageOptions = (page = 1, limit = DEFAULT_TEAM_MEMBER_LIMIT) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const parsedLimit = Number.parseInt(limit, 10) || DEFAULT_TEAM_MEMBER_LIMIT;
  const safeLimit = Math.min(MAX_TEAM_MEMBER_LIMIT, Math.max(1, parsedLimit));

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const buildManagerOwnershipFilter = (managerId) => ({
  $or: [{ assignedTo: managerId }, { assignedBy: managerId }],
});

const managerOwnsLead = (lead, managerId) => {
  const managerKey = String(managerId || "");
  if (!lead || !managerKey) {
    return false;
  }

  const assignedToKey = lead.assignedTo ? String(lead.assignedTo._id || lead.assignedTo) : "";
  const assignedByKey = lead.assignedBy ? String(lead.assignedBy._id || lead.assignedBy) : "";

  return assignedToKey === managerKey || assignedByKey === managerKey;
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

const normalizeEmail = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    throw createHttpError(400, "Email is required.");
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    throw createHttpError(400, "Enter a valid email address.");
  }

  return normalized;
};

const normalizePhone = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20);

exports.getSignupMeta = asyncHandler(async (req, res) => {
  const requestedZone = normalizeZoneInput(req.query.zone);
  if (req.query.zone && !requestedZone) {
    throw createHttpError(400, "Invalid zone. Use North, South, East, or West.");
  }

  if (requestedZone) {
    const occupiedStates = await getReservedStatesForZone(requestedZone);
    return res.status(200).json({
      success: true,
      data: {
        zones: CANONICAL_ZONES,
        selectedZone: requestedZone,
        availableStates: getAvailableStatesForZone(requestedZone, occupiedStates),
      },
    });
  }

  const availableStatesByZoneEntries = await Promise.all(
    CANONICAL_ZONES.map(async (zone) => {
      const occupiedStates = await getReservedStatesForZone(zone);
      return [zone, getAvailableStatesForZone(zone, occupiedStates)];
    }),
  );

  res.status(200).json({
    success: true,
    data: {
      zones: CANONICAL_ZONES,
      availableStatesByZone: Object.fromEntries(availableStatesByZoneEntries),
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
  const normalizedEmail = email.trim().toLowerCase();
  const [existingUser, existingZoneStateManager] = await Promise.all([
    CrmUser.findOne({ email: normalizedEmail }),
    CrmUser.findOne(buildStateReservationQuery(normalizedZone, normalizedState)).select("_id"),
  ]);

  if (existingUser) {
    throw createHttpError(409, "User with this email already exists");
  }

  if (existingZoneStateManager) {
    throw createHttpError(409, `${normalizedState} is already assigned to another State Manager in ${normalizedZone} zone.`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    password: hashedPassword,
    role: "STATE_MANAGER",
    territory: normalizedZone,
    state: normalizedState,
    accessStatus: "PENDING_INVITE",
    isActive: false,
  });

  res.status(201).json({
    success: true,
    message: "Signup request submitted. Please wait for zonal manager approval.",
    user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      zone: normalizedZone,
      state: normalizedState,
      role: user.role,
      accessStatus: user.accessStatus,
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

  const normalizedEmail = email.trim().toLowerCase();
  const user = await CrmUser.findOne({ email: normalizedEmail }).select("+password");

  if (!user || user.role !== "STATE_MANAGER") {
    throw createHttpError(401, "Invalid email, zone, or password");
  }

  if (getUserZone(user) !== normalizedZone) {
    throw createHttpError(401, "Incorrect zone for this user");
  }

  if (user.accessStatus === "PENDING_INVITE") {
    throw createHttpError(403, "Your account is pending zonal manager approval.");
  }

  if (user.accessStatus === "RESTRICTED" || !user.isActive) {
    throw createHttpError(403, "Your account is restricted. Please contact your zonal manager.");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
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
      state: user.state || "",
      role: user.role,
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
  const zone = getUserZone(req.user);

  res.status(200).json({
    success: true,
    data: {
      id: String(req.user._id),
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      zone,
      state: req.user.state || "",
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
      state: user.state || "",
      profileImage: user.profileImageUrl || "",
    },
  });
});

// Get Leads for State Manager
exports.getLeads = asyncHandler(async (req, res) => {
  const { search, location, date, page = 1, limit = 50, sourceRole } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  let targetZone = req.user.role === "STATE_MANAGER" ? getUserZone(req.user) : "";
  const managerState = getUserState(req.user);
  if (!targetZone || !managerState) {
    throw createHttpError(403, "Unable to resolve zone/state for this State Manager account.");
  }

  // Determine which members to filter by
  let memberIds = [];
  if (sourceRole) {
    const roleQuery = {
      ...buildManagedRoleQuery(sourceRole),
      ...buildTerritoryFilter(targetZone),
      state: managerState,
    };
    const members = await CrmUser.find(roleQuery).select("_id");
    memberIds = members.map(u => u._id);
  } else {
    // Default: Show leads from both Leadgens and FSEs in the state
    const teamQuery = {
      ...buildAnyManagedRoleQuery(),
      ...buildTerritoryFilter(targetZone),
      state: managerState,
    };
    const team = await CrmUser.find(teamQuery).select("_id");
    memberIds = team.map(u => u._id);
  }

  const query = {
    state: managerState,
    $or: [
      { createdBy: { $in: memberIds } },
      { assignedTo: { $in: memberIds } }
    ]
  };

  if (req.query.status) {
    query.status = req.query.status;
  } else {
    // Filter out purely "NEW" leads if they haven't been forwarded or touched by an FSE
    // unless explicitly requested
    query.status = { $in: ["FORWARDED", "ASSIGNED", "CONVERTED", "REJECTED", "LOST", "CONTACTED", "FOLLOW_UP", "QUALIFIED"] };
  }

  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { companyName: searchRegex },
        { contactName: searchRegex },
        { phone: searchRegex },
        { leadCode: searchRegex },
      ],
    });
  }

  if (date && date !== "All Dates") {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    if (date === "today") {
      query.createdAt = { $gte: startOfToday };
    } else if (date === "yesterday") {
      const startOfYesterday = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 1));
      query.createdAt = { $gte: startOfYesterday, $lt: startOfToday };
    } else if (date === "this_week") {
      const startOfWeek = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 7));
      query.createdAt = { $gte: startOfWeek };
    } else if (date === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: startOfMonth };
    }
  }

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .populate("createdBy", "fullName territory email")
      .populate("assignedTo", "fullName email territory profileImageUrl")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Lead.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    },
    data: leads,
  });
});

exports.getFSEs = asyncHandler(async (req, res) => {
  const myZone = getUserZone(req.user);
  const myState = getUserState(req.user);
  if (!myZone) {
    throw createHttpError(403, "Unable to resolve zone for this State Manager account.");
  }
  if (!myState) {
    throw createHttpError(403, "Unable to resolve state for this State Manager account.");
  }

  const fses = await CrmUser.find({
    ...buildManagedRoleQuery("FSE"),
    ...buildTerritoryFilter(myZone),
    state: myState,
    isActive: true,
    accessStatus: { $ne: "RESTRICTED" },
  }).select("_id fullName email territory state phone profileImageUrl");

  const fseIds = fses.map((fse) => fse._id);
  const leadCounts = fseIds.length
    ? await Lead.aggregate([
        {
          $match: {
            assignedTo: { $in: fseIds },
            status: { $nin: ["CONVERTED", "LOST", "REJECTED"] },
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
    data: fses.map((fse) => ({
      id: String(fse._id),
      fullName: fse.fullName,
      email: fse.email,
      zone: getUserZone(fse),
      state: fse.state || "",
      phone: fse.phone || "",
      activeLeads: activeLeadMap.get(String(fse._id)) || 0,
      profileImage: fse.profileImageUrl || "",
    })),
  });
});

exports.createManagedMember = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "STATE_MANAGER") {
    throw createHttpError(403, "Only State Managers can create team members.");
  }

  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);

  if (!managerZone || !managerState) {
    throw createHttpError(403, "State Manager zone/state is not configured.");
  }

  const { fullName, email, phone, password, confirmPassword } = req.body;
  const role = String(req.body.role || "").trim().toUpperCase();
  const requestedZone = normalizeZoneInput(req.body.zone);
  const requestedState = normalizeIndianStateInput(req.body.state);

  if (!MANAGED_MEMBER_ROLES.includes(role)) {
    throw createHttpError(400, `role must be one of: ${MANAGED_MEMBER_ROLES.join(", ")}`);
  }

  if (!fullName || !email || !password || !confirmPassword) {
    throw createHttpError(
      400,
      "All required fields must be provided (fullName, email, password, confirmPassword, role).",
    );
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, "Passwords do not match.");
  }

  if (String(password).length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  if (requestedZone && requestedZone !== managerZone) {
    throw createHttpError(403, "You can only create team members in your assigned zone.");
  }

  if (requestedState && requestedState !== managerState) {
    throw createHttpError(403, "You can only create team members in your assigned state.");
  }

  const normalizedFullName = normalizeFullName(fullName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingUser = await CrmUser.findOne({ email: normalizedEmail }).select(
    "_id fullName email phone role designations territory state isActive accessStatus createdAt updatedAt",
  );

  if (existingUser) {
    const existingZone = getUserZone(existingUser);
    const existingState = getUserState(existingUser);
    const existingRoles = getMemberRoles(existingUser);
    const hasManagedDesignation = existingRoles.some((item) => MANAGED_MEMBER_ROLES.includes(item));

    if (!hasManagedDesignation) {
      // If it's a candidate or client, we might still want to add the role if the admin allows, 
      // but for now let's keep it restricted to managed roles as per UI.
      throw createHttpError(409, "An account with this email already exists with a different user type.");
    }

    if (existingZone !== managerZone || existingState !== managerState) {
      throw createHttpError(
        409,
        "This email is already registered in a different state/zone.",
      );
    }

    if (existingRoles.includes(role)) {
      if (!existingUser.isActive || existingUser.accessStatus === "RESTRICTED") {
        existingUser.fullName = normalizedFullName;
        existingUser.phone = normalizedPhone;
        // Only update password if provided
        if (password) {
          existingUser.password = hashedPassword;
        }
        existingUser.territory = managerZone;
        existingUser.state = managerState;
        existingUser.accessStatus = "ACTIVE";
        existingUser.isActive = true;
        await existingUser.save();

        return res.status(200).json({
          success: true,
          message: `${role === "FSE" ? "FSE" : "Lead Generator"} account reactivated successfully.`,
          data: {
            id: String(existingUser._id),
            fullName: existingUser.fullName,
            email: existingUser.email,
            role,
            primaryRole: existingUser.role,
            designations: getMemberRoles(existingUser),
            zone: getUserZone(existingUser),
            state: existingUser.state || "",
            phone: existingUser.phone || "",
            accessStatus: existingUser.accessStatus,
            isActive: Boolean(existingUser.isActive),
            createdAt: existingUser.createdAt,
            updatedAt: existingUser.updatedAt,
          },
        });
      }

      throw createHttpError(409, `This account already has the ${role === "FSE" ? "FSE" : "Lead Generator"} designation.`);
    }

    const nextRoleSet = new Set(existingRoles);
    nextRoleSet.add(role);
    const nextRoles = Array.from(nextRoleSet);

    // Keep the current primary role if it's already one of the managed roles
    const nextPrimaryRole = MANAGED_MEMBER_ROLES.includes(existingUser.role) ? existingUser.role : nextRoles[0];
    const nextDesignations = nextRoles.filter((item) => item !== nextPrimaryRole);

    existingUser.fullName = normalizedFullName;
    existingUser.phone = normalizedPhone;
    if (password) {
      existingUser.password = hashedPassword;
    }
    existingUser.role = nextPrimaryRole;
    existingUser.designations = nextDesignations;
    existingUser.territory = managerZone;
    existingUser.state = managerState;
    existingUser.accessStatus = "ACTIVE";
    existingUser.isActive = true;
    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: `${role === "FSE" ? "FSE" : "Lead Generator"} designation successfully added to existing user.`,
      data: {
        id: String(existingUser._id),
        fullName: existingUser.fullName,
        email: existingUser.email,
        role,
        primaryRole: existingUser.role,
        designations: getMemberRoles(existingUser),
        zone: getUserZone(existingUser),
        state: existingUser.state || "",
        phone: existingUser.phone || "",
        accessStatus: existingUser.accessStatus,
        isActive: Boolean(existingUser.isActive),
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      },
    });
  }

  const createdMember = await CrmUser.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password: hashedPassword,
    role,
    designations: [],
    territory: managerZone,
    state: managerState,
    accessStatus: "ACTIVE",
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: `${role === "FSE" ? "FSE" : "Lead Generator"} account created successfully.`,
    data: {
      id: String(createdMember._id),
      fullName: createdMember.fullName,
      email: createdMember.email,
      role,
      primaryRole: createdMember.role,
      designations: getMemberRoles(createdMember),
      zone: getUserZone(createdMember),
      state: createdMember.state || "",
      phone: createdMember.phone || "",
      accessStatus: createdMember.accessStatus,
      isActive: Boolean(createdMember.isActive),
      createdAt: createdMember.createdAt,
      updatedAt: createdMember.updatedAt,
    },
  });
});

exports.getManagedMembers = asyncHandler(async (req, res) => {
  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);
  const role = String(req.query.role || "").trim().toUpperCase();
  const search = String(req.query.search || "").trim();
  const { page, limit, skip } = resolvePageOptions(req.query.page, req.query.limit);

  if (!managerZone || !managerState) {
    throw createHttpError(403, "State Manager zone/state is not configured.");
  }

  if (!MANAGED_MEMBER_ROLES.includes(role)) {
    throw createHttpError(400, `role must be one of: ${MANAGED_MEMBER_ROLES.join(", ")}`);
  }

  const query = {
    ...buildTerritoryFilter(managerZone),
    state: managerState,
    isActive: true,
    accessStatus: { $ne: "RESTRICTED" },
    $and: [buildManagedRoleQuery(role)],
  };

  if (search) {
    const searchRegex = { $regex: escapeRegExp(search), $options: "i" };
    query.$and.push({
      $or: [{ fullName: searchRegex }, { email: searchRegex }, { phone: searchRegex }],
    });
  }

  const [members, total] = await Promise.all([
    CrmUser.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("_id fullName email role designations territory state phone isActive accessStatus profileImageUrl createdAt updatedAt"),
    CrmUser.countDocuments(query),
  ]);

  const memberIds = members.map((member) => member._id);
  const generatedLeadCounts = memberIds.length
    ? await Lead.aggregate([
        {
          $match: {
            createdBy: { $in: memberIds },
          },
        },
        {
          $group: {
            _id: "$createdBy",
            totalLeadsGenerated: { $sum: 1 },
            convertedLeads: {
              $sum: {
                $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
              },
            },
          },
        },
      ])
    : [];

  const generatedLeadMap = new Map(
    generatedLeadCounts.map((item) => [
      String(item._id),
      {
        totalLeadsGenerated: Number(item.totalLeadsGenerated || 0),
        convertedLeads: Number(item.convertedLeads || 0),
      },
    ]),
  );

  res.status(200).json({
    success: true,
    data: {
      items: members.map((member) => {
        const stats = generatedLeadMap.get(String(member._id)) || {
          totalLeadsGenerated: 0,
          convertedLeads: 0,
        };

        return {
          id: String(member._id),
          fullName: member.fullName,
          email: member.email,
          role,
          primaryRole: member.role,
          designations: getMemberRoles(member),
          zone: getUserZone(member),
          state: member.state || "",
          phone: member.phone || "",
          profileImage: member.profileImageUrl || "",
          accessStatus: member.accessStatus,
          isActive: Boolean(member.isActive),
          totalLeadsGenerated: stats.totalLeadsGenerated,
          convertedLeads: stats.convertedLeads,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
});

exports.getManagedMemberById = asyncHandler(async (req, res) => {
  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);
  const { id } = req.params;

  if (!managerZone || !managerState) {
    throw createHttpError(403, "State Manager zone/state is not configured.");
  }

  const member = await CrmUser.findOne({
    _id: id,
    ...buildAnyManagedRoleQuery(),
    ...buildTerritoryFilter(managerZone),
    state: managerState,
  }).select("_id fullName email role designations territory state phone department scope isActive accessStatus profileImageUrl createdAt updatedAt");

  if (!member) {
    throw createHttpError(404, "Team member not found in your state.");
  }

  const [leadStats] = await Lead.aggregate([
    {
      $match: {
        createdBy: member._id,
      },
    },
    {
      $group: {
        _id: "$createdBy",
        totalLeadsGenerated: { $sum: 1 },
        convertedLeads: {
          $sum: {
            $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
          },
        },
        forwardedLeads: {
          $sum: {
            $cond: [{ $in: ["$status", ["FORWARDED", "ASSIGNED"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      id: String(member._id),
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      designations: getMemberRoles(member),
      zone: getUserZone(member),
      state: member.state || "",
      phone: member.phone || "",
      department: member.department || "",
      scope: member.scope || "",
      profileImage: member.profileImageUrl || "",
      isActive: Boolean(member.isActive),
      accessStatus: member.accessStatus,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      totalLeadsGenerated: Number(leadStats?.totalLeadsGenerated || 0),
      convertedLeads: Number(leadStats?.convertedLeads || 0),
      forwardedLeads: Number(leadStats?.forwardedLeads || 0),
    },
  });
});

exports.updateManagedMember = asyncHandler(async (req, res) => {
  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);
  const { id } = req.params;

  if (!managerZone || !managerState) {
    throw createHttpError(403, "State Manager zone/state is not configured.");
  }

  const member = await CrmUser.findOne({
    _id: id,
    ...buildAnyManagedRoleQuery(),
    ...buildTerritoryFilter(managerZone),
    state: managerState,
  }).select(
    "_id fullName email phone role designations territory state password isActive accessStatus createdAt updatedAt",
  );

  if (!member) {
    throw createHttpError(404, "Team member not found in your state.");
  }

  const hasFullName = req.body.fullName !== undefined;
  const hasEmail = req.body.email !== undefined;
  const hasPhone = req.body.phone !== undefined;
  const hasPassword =
    req.body.password !== undefined && String(req.body.password || "").trim().length > 0;
  const hasConfirmPassword =
    req.body.confirmPassword !== undefined &&
    String(req.body.confirmPassword || "").trim().length > 0;

  if (!hasFullName && !hasEmail && !hasPhone && !hasPassword && !hasConfirmPassword) {
    throw createHttpError(400, "At least one editable field is required.");
  }

  if (hasFullName) {
    member.fullName = normalizeFullName(req.body.fullName);
  }

  if (hasEmail) {
    const normalizedEmail = normalizeEmail(req.body.email);
    const conflictUser = await CrmUser.findOne({
      email: normalizedEmail,
      _id: { $ne: member._id },
    }).select("_id");

    if (conflictUser) {
      throw createHttpError(409, "User with this email already exists.");
    }

    member.email = normalizedEmail;
  }

  if (hasPhone) {
    member.phone = normalizePhone(req.body.phone);
  }

  if (hasPassword || hasConfirmPassword) {
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!password || !confirmPassword) {
      throw createHttpError(400, "Both password and confirmPassword are required to reset password.");
    }

    if (password !== confirmPassword) {
      throw createHttpError(400, "Passwords do not match.");
    }

    if (password.length < 8) {
      throw createHttpError(400, "Password must be at least 8 characters.");
    }

    member.password = await bcrypt.hash(password, 10);
  }

  member.territory = managerZone;
  member.state = managerState;
  await member.save();

  res.status(200).json({
    success: true,
    message: "Team member updated successfully.",
    data: {
      id: String(member._id),
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      designations: getMemberRoles(member),
      zone: getUserZone(member),
      state: member.state || "",
      phone: member.phone || "",
      accessStatus: member.accessStatus,
      isActive: Boolean(member.isActive),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    },
  });
});

exports.deleteManagedMember = asyncHandler(async (req, res) => {
  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);
  const { id } = req.params;
  const requestedRole = String(req.query.role || "").trim().toUpperCase();

  if (!managerZone || !managerState) {
    throw createHttpError(403, "State Manager zone/state is not configured.");
  }

  if (requestedRole && !MANAGED_MEMBER_ROLES.includes(requestedRole)) {
    throw createHttpError(400, `role must be one of: ${MANAGED_MEMBER_ROLES.join(", ")}`);
  }

  const member = await CrmUser.findOne({
    _id: id,
    ...buildAnyManagedRoleQuery(),
    ...buildTerritoryFilter(managerZone),
    state: managerState,
  }).select("_id fullName email role designations isActive accessStatus");

  if (!member) {
    throw createHttpError(404, "Team member not found in your state.");
  }

  const memberManagedRoles = getMemberRoles(member).filter((item) => MANAGED_MEMBER_ROLES.includes(item));
  if (!memberManagedRoles.length) {
    throw createHttpError(404, "Team member not found in your state.");
  }

  let roleToRemove = requestedRole;
  if (!roleToRemove) {
    if (memberManagedRoles.length > 1) {
      throw createHttpError(
        400,
        "This account has multiple designations. Pass role=FSE or role=LEAD_GENERATOR to remove a specific one.",
      );
    }
    [roleToRemove] = memberManagedRoles;
  }

  if (!memberManagedRoles.includes(roleToRemove)) {
    throw createHttpError(
      404,
      `${roleToRemove === "FSE" ? "FSE" : "Lead Generator"} designation not found for this account.`,
    );
  }

  let accountRestricted = false;
  const remainingManagedRoles = memberManagedRoles.filter((item) => item !== roleToRemove);
  if (remainingManagedRoles.length) {
    const nextPrimaryRole = remainingManagedRoles.includes(member.role)
      ? member.role
      : remainingManagedRoles[0];
    member.role = nextPrimaryRole;
    member.designations = remainingManagedRoles.filter((item) => item !== nextPrimaryRole);
  } else {
    accountRestricted = true;
    member.isActive = false;
    member.accessStatus = "RESTRICTED";
    member.designations = [];
  }
  await member.save();

  if (roleToRemove === "FSE") {
    await Lead.updateMany(
      {
        assignedTo: member._id,
        status: { $nin: ["CONVERTED", "LOST", "REJECTED"] },
      },
      {
        $set: {
          assignedTo: null,
          assignedBy: req.user._id,
          updatedBy: req.user._id,
          status: "FORWARDED",
        },
      },
    );
  }

  res.status(200).json({
    success: true,
    message: accountRestricted
      ? `${roleToRemove === "FSE" ? "FSE" : "Lead Generator"} account deleted successfully.`
      : `${roleToRemove === "FSE" ? "FSE" : "Lead Generator"} designation removed successfully.`,
    data: {
      id: String(member._id),
      role: roleToRemove,
      remainingDesignations: getMemberRoles(member).filter((item) => MANAGED_MEMBER_ROLES.includes(item)),
      isActive: Boolean(member.isActive),
      accessStatus: member.accessStatus,
      email: member.email,
    },
  });
});

exports.assignLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fseId } = req.body;

  if (!fseId || typeof fseId !== "string" || fseId.length !== 24) {
    throw createHttpError(400, "Valid fseId is required.");
  }

  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);
  if (!managerZone) {
    throw createHttpError(403, "State Manager zone is not configured.");
  }
  if (!managerState) {
    throw createHttpError(403, "State Manager state is not configured.");
  }

  const [lead, fse] = await Promise.all([
    Lead.findById(id).populate("createdBy", "territory fullName"),
    CrmUser.findById(fseId),
  ]);

  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (!fse || !hasMemberRole(fse, "FSE") || !fse.isActive || fse.accessStatus === "RESTRICTED") {
    throw createHttpError(404, "Active FSE not found");
  }

  const leadZone = inferZoneFromTerritory(lead.createdBy?.territory);
  const fseZone = getUserZone(fse);
  const fseState = getUserState(fse);
  const leadState = normalizeIndianStateInput(lead.state);

  if (!leadZone || leadZone !== managerZone) {
    throw createHttpError(403, "This lead does not belong to your zone.");
  }

  if (!leadState || leadState !== managerState) {
    throw createHttpError(403, "This lead does not belong to your state.");
  }

  if (!managerOwnsLead(lead, req.user._id)) {
    throw createHttpError(403, "This lead is not assigned to your account.");
  }

  if (!fseZone || fseZone !== managerZone) {
    throw createHttpError(403, "FSE must belong to the same zone as the State Manager.");
  }

  if (!fseState || fseState !== managerState) {
    throw createHttpError(403, "FSE must belong to the same state as the State Manager.");
  }

  lead.status = "ASSIGNED";
  lead.assignedTo = fseId;
  lead.assignedBy = req.user._id;
  lead.updatedBy = req.user._id;

  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("createdBy", "fullName territory email")
    .populate("assignedTo", "fullName email territory profileImageUrl");

  res.status(200).json({
    success: true,
    message: "Lead assigned successfully",
    data: updatedLead
  });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const myZone = getUserZone(req.user);
  const myState = getUserState(req.user);
  const { startDate, endDate, memberId } = req.query;

  if (!myZone || !myState) {
    throw createHttpError(403, "Unable to resolve zone/state for this State Manager account.");
  }

  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const [zoneLGUsers, zoneFSEUsers] = await Promise.all([
    CrmUser.find({
      ...buildManagedRoleQuery("LEAD_GENERATOR"),
      ...buildTerritoryFilter(myZone),
      state: myState,
      isActive: true,
      accessStatus: { $ne: "RESTRICTED" },
    }).select("_id fullName email territory state profileImageUrl targets"),
    CrmUser.find({
      ...buildManagedRoleQuery("FSE"),
      ...buildTerritoryFilter(myZone),
      state: myState,
      isActive: true,
      accessStatus: { $ne: "RESTRICTED" },
    }).select("_id fullName email territory state profileImageUrl targets"),
  ]);

  const generatorIds = memberId ? [memberId] : zoneLGUsers.map((user) => user._id);
  const fseIds = memberId ? [memberId] : zoneFSEUsers.map((user) => user._id);

  const [scopedLeads, fsePerformanceRows, generatorPerformanceRows, recentAssigned] = await Promise.all([
    generatorIds.length
      ? Lead.find({
          createdBy: { $in: generatorIds },
          state: myState,
          ...dateFilter
        }).sort({ updatedAt: -1 })
      : Promise.resolve([]),
    fseIds.length
      ? Lead.aggregate([
          {
            $match: {
              assignedTo: { $in: fseIds },
              state: myState,
              ...dateFilter
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
              activeLeads: {
                $sum: {
                  $cond: [{ $in: ["$status", TERMINAL_LEAD_STATUSES] }, 0, 1],
                },
              },
              lastUpdatedAt: { $max: "$updatedAt" },
            },
          },
        ])
      : Promise.resolve([]),
    generatorIds.length
      ? Lead.aggregate([
          {
            $match: {
              createdBy: { $in: generatorIds },
              state: myState,
              ...dateFilter
            },
          },
          {
            $group: {
              _id: "$createdBy",
              totalGeneratedLeads: { $sum: 1 },
              convertedLeads: {
                $sum: {
                  $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0],
                },
              },
              forwardedLeads: {
                $sum: {
                  $cond: [{ $in: ["$status", FORWARDED_PIPELINE_STATUSES] }, 1, 0],
                },
              },
              pendingLeads: {
                $sum: {
                  $cond: [{ $in: ["$status", GENERATOR_PENDING_STATUSES] }, 1, 0],
                },
              },
              lastCreatedAt: { $max: "$createdAt" },
              lastUpdatedAt: { $max: "$updatedAt" },
            },
          },
        ])
      : Promise.resolve([]),
    fseIds.length
      ? Lead.find({
          state: myState,
          assignedTo: { $in: fseIds },
          status: { $in: ["ASSIGNED", "CONVERTED", "LOST", "REJECTED", "FORWARDED"] },
          ...dateFilter
        })
          .populate("assignedTo", "fullName profileImageUrl")
          .sort({ updatedAt: -1 })
          .limit(50)
      : Promise.resolve([]),
  ]);

  const toInitials = (value = "", fallback = "N") => {
    const initials = String(value || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

    return initials || fallback;
  };

  const toPercent = (numerator = 0, denominator = 0) => {
    if (!denominator) {
      return 0;
    }

    return Math.round((Number(numerator || 0) / Number(denominator || 0)) * 100);
  };

  const fsePerformanceMap = new Map(
    fsePerformanceRows.map((item) => [String(item._id), item]),
  );
  const leadGeneratorPerformanceMap = new Map(
    generatorPerformanceRows.map((item) => [String(item._id), item]),
  );

  const fseMembers = zoneFSEUsers
    .filter(fse => !memberId || String(fse._id) === memberId)
    .map((fse) => {
      const stats = fsePerformanceMap.get(String(fse._id)) || {};
      const totalAssignedLeads = Number(stats.totalAssignedLeads || 0);
      const convertedLeads = Number(stats.convertedLeads || 0);
      const activeLeads = Number(stats.activeLeads || 0);

      return {
        id: String(fse._id),
        initials: toInitials(fse.fullName, "F"),
        name: fse.fullName || "FSE",
        email: fse.email || "",
        zone: getUserZone(fse) || myZone,
        state: fse.state || myState,
        activeLeads,
        convertedLeads,
        totalAssignedLeads,
        conversionRate: `${toPercent(convertedLeads, totalAssignedLeads)}%`,
        lastUpdatedAt: stats.lastUpdatedAt || null,
        status: "Active",
        profileImage: fse.profileImageUrl || "",
        targets: fse.targets || { leadGeneration: 0, conversions: 0, meetings: 0 }
      };
    })
    .sort((left, right) => (right.convertedLeads - left.convertedLeads));

  const leadGeneratorMembers = zoneLGUsers
    .filter(lg => !memberId || String(lg._id) === memberId)
    .map((leadGenerator) => {
      const stats = leadGeneratorPerformanceMap.get(String(leadGenerator._id)) || {};
      const totalGeneratedLeads = Number(stats.totalGeneratedLeads || 0);
      const convertedLeads = Number(stats.convertedLeads || 0);
      const forwardedLeads = Number(stats.forwardedLeads || 0);
      const pendingLeads = Number(stats.pendingLeads || 0);

      return {
        id: String(leadGenerator._id),
        initials: toInitials(leadGenerator.fullName, "LG"),
        name: leadGenerator.fullName || "Lead Generator",
        email: leadGenerator.email || "",
        zone: getUserZone(leadGenerator) || myZone,
        state: leadGenerator.state || myState,
        totalGeneratedLeads,
        forwardedLeads,
        convertedLeads,
        pendingLeads,
        conversionRate: `${toPercent(convertedLeads, totalGeneratedLeads)}%`,
        lastCreatedAt: stats.lastCreatedAt || null,
        lastUpdatedAt: stats.lastUpdatedAt || null,
        status: "Active",
        profileImage: leadGenerator.profileImageUrl || "",
        targets: leadGenerator.targets || { leadGeneration: 0, conversions: 0, meetings: 0 }
      };
    })
    .sort((left, right) => (right.totalGeneratedLeads - left.totalGeneratedLeads));

  const pendingValidation = scopedLeads.filter((lead) => lead.status === "FORWARDED").length;
  const totalAssigned = scopedLeads.filter((lead) => lead.status === "ASSIGNED").length;
  const converted = scopedLeads.filter((lead) => lead.status === "CONVERTED").length;
  const totalLeads = totalAssigned + converted;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      pendingValidation,
      activeFses: fseMembers.length,
      activeLeadGenerators: leadGeneratorMembers.length,
      totalAssigned,
      totalLeadsGenerated: leadGeneratorMembers.reduce((acc, m) => acc + m.totalGeneratedLeads, 0),
      conversionRate: `${conversionRate}%`,
      rolePerformance: {
        fse: {
          summary: {
            totalMembers: fseMembers.length,
            convertedLeads: fseMembers.reduce((acc, m) => acc + m.convertedLeads, 0),
            totalAssignedLeads: fseMembers.reduce((acc, m) => acc + m.totalAssignedLeads, 0),
          },
          members: fseMembers,
        },
        leadGenerator: {
          summary: {
            totalMembers: leadGeneratorMembers.length,
            totalGeneratedLeads: leadGeneratorMembers.reduce((acc, m) => acc + m.totalGeneratedLeads, 0),
            forwardedLeads: leadGeneratorMembers.reduce((acc, m) => acc + m.forwardedLeads, 0),
          },
          members: leadGeneratorMembers,
        },
      },
      recentActivity: recentAssigned.map(lead => ({
        id: String(lead._id),
        type: lead.status === "CONVERTED" ? "success" : "primary",
        text: `Lead ${lead.leadCode} ${lead.status.toLowerCase()} by ${lead.assignedTo?.fullName || "FSE"}`,
        time: lead.updatedAt
      }))
    },
  });
});

exports.updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const ALLOWED_STATUSES = ["CONVERTED", "FORWARDED", "REJECTED", "ASSIGNED", "LOST"];

  const nextStatus = String(status || "").toUpperCase();

  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    throw createHttpError(400, "Invalid status upgrade");
  }

  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);
  if (!managerZone) {
    throw createHttpError(403, "State Manager zone is not configured.");
  }
  if (!managerState) {
    throw createHttpError(403, "State Manager state is not configured.");
  }

  const lead = await Lead.findById(id).populate("createdBy", "territory");

  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  const leadZone = inferZoneFromTerritory(lead.createdBy?.territory);
  const leadState = normalizeIndianStateInput(lead.state);
  if (!leadZone || leadZone !== managerZone) {
    throw createHttpError(403, "You can only update leads from your own zone.");
  }
  if (!leadState || leadState !== managerState) {
    throw createHttpError(403, "You can only update leads from your own state.");
  }

  if (!managerOwnsLead(lead, req.user._id)) {
    throw createHttpError(403, "This lead is not assigned to your account.");
  }

  if (nextStatus === "ASSIGNED" && !lead.assignedTo) {
    throw createHttpError(400, "Lead must be assigned to an FSE before moving to ASSIGNED.");
  }

  lead.status = nextStatus;
  lead.updatedBy = req.user._id;

  if (nextStatus === "CONVERTED") {
    lead.convertedAt = new Date();
  }

  await lead.save();

  res.status(200).json({
    success: true,
    message: "Lead status updated",
    data: lead
  });
});

exports.updateMemberTargets = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { leadGeneration, conversions, meetings } = req.body;

  const managerZone = getUserZone(req.user);
  const managerState = getUserState(req.user);

  const member = await CrmUser.findOne({
    _id: id,
    ...buildAnyManagedRoleQuery(),
    ...buildTerritoryFilter(managerZone),
    state: managerState,
  });

  if (!member) {
    throw createHttpError(404, "Team member not found in your state.");
  }

  member.targets = {
    leadGeneration: Number(leadGeneration) || 0,
    conversions: Number(conversions) || 0,
    meetings: Number(meetings) || 0,
  };

  await member.save();

  res.status(200).json({
    success: true,
    message: "Targets updated successfully",
    data: member.targets,
  });
});
