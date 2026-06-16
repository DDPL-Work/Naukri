const bcrypt = require("bcryptjs");
const asyncHandler = require("../middleware/async.middleware");
const User = require("../models/User");
const CrmUser = require("../models/CrmUser");
const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");
const {
  ACCESS_TOKEN_TTL,
  buildAuthUser,
  clearAuthCookies,
  extractAccessToken,
  extractRefreshToken,
  issueTokenPair,
  revokeSessionFromRefreshToken,
  revokeSession,
  rotateRefreshToken,
  setAccessCookie,
  setRefreshCookie,
  validateSession,
} = require("../services/auth.service");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const findAccountByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  const [user, crmUser] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    CrmUser.findOne({ email: normalizedEmail }),
  ]);

  if (user) {
    return { doc: user, source: "USER" };
  }

  if (crmUser) {
    return { doc: crmUser, source: "CRM" };
  }

  return null;
};

const sendAuthResponse = async (req, res, { user, source }) => {
  const tokenPair = await issueTokenPair({
    user,
    source,
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);
  setAccessCookie(res, tokenPair.accessToken);

  return res.status(200).json({
    success: true,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: tokenPair.user,
  });
};

exports.registerCandidate = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || "").trim();
  const normalizedPassword = String(password || "").trim();

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    throw createHttpError(400, "Name, email, and password are required");
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw createHttpError(409, "Email already exists");
  }

  const hashed = await bcrypt.hash(normalizedPassword, 10);

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashed,
    role: "CANDIDATE",
    accessStatus: "ACTIVE",
    isActive: true,
  });

  EventBus.emit(EVENTS.CANDIDATE_REGISTERED, {
    candidateId: user._id,
    email: user.email,
    fullName: user.name,
  });

  const tokenPair = await issueTokenPair({
    user,
    source: "USER",
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);
  setAccessCookie(res, tokenPair.accessToken);

  res.status(201).json({
    success: true,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: tokenPair.user,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "").trim();

  if (!normalizedEmail || !normalizedPassword) {
    throw createHttpError(400, "Email and password are required");
  }

  const account = await findAccountByEmail(normalizedEmail);

  if (!account) {
    throw createHttpError(401, "Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(normalizedPassword, account.doc.password);
  if (!passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (!account.doc.isActive || account.doc.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Account is inactive");
  }

  const shouldRestrictCandidateLogin =
    account.source === "USER" && account.doc.role !== "CANDIDATE" ? false : false;

  if (shouldRestrictCandidateLogin) {
    throw createHttpError(403, "Account is not allowed to log in here");
  }

  return sendAuthResponse(req, res, account);
});

exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  if (!refreshToken) {
    throw createHttpError(401, "Refresh token required");
  }

  const tokenPair = await rotateRefreshToken({
    refreshToken,
    req,
  });

  setRefreshCookie(res, tokenPair.refreshToken);
  setAccessCookie(res, tokenPair.accessToken);

  res.status(200).json({
    success: true,
    accessToken: tokenPair.accessToken,
    expiresInSeconds: tokenPair.expiresInSeconds,
    user: tokenPair.user,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = extractRefreshToken(req);

  if (refreshToken) {
    try {
      await revokeSessionFromRefreshToken({
        refreshToken,
        reason: "logout",
      });
    } catch {
      // Intentionally ignore validation errors during logout so the cookie is still cleared.
    }
  } else {
    const accessToken = extractAccessToken(req);
    if (accessToken) {
      try {
        const session = await validateSession({ accessToken });
        if (session?.session?.sessionId) {
          await revokeSession({
            sessionId: session.session.sessionId,
            reason: "logout",
          });
        }
      } catch {
        // Intentionally ignore validation errors during logout so the client can still clear local state.
      }
    }
  }

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

exports.me = asyncHandler(async (req, res) => {
  const accessToken = extractAccessToken(req);

  const session = await validateSession({ accessToken });

  res.status(200).json({
    success: true,
    user: buildAuthUser(session.user, session.source),
  });
});

exports.session = asyncHandler(async (req, res) => {
  const accessToken = extractAccessToken(req);

  const session = await validateSession({ accessToken });

  res.status(200).json({
    success: true,
    data: {
      active: true,
      expiresInSeconds: 15 * 60,
      user: buildAuthUser(session.user, session.source),
      sessionId: session.session.sessionId,
      source: session.source,
      tokenTtl: ACCESS_TOKEN_TTL,
    },
  });
});

exports.revoke = asyncHandler(async (req, res) => {
  const sessionId = String(req.body?.sessionId || "").trim();
  const refreshToken = extractRefreshToken(req);

  if (sessionId) {
    await revokeSession({
      sessionId,
      reason: "manual_revoke",
    });
  } else if (refreshToken) {
    await revokeSessionFromRefreshToken({
      refreshToken,
      reason: "manual_revoke",
    });
  } else {
    throw createHttpError(400, "Session ID or refresh token is required");
  }

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Session revoked successfully",
  });
});
