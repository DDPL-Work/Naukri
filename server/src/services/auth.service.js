const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/RefreshToken");
const Session = require("../models/Session");
const User = require("../models/User");
const CrmUser = require("../models/CrmUser");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "mvn_refresh_token";
const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || "mvn_access_token";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === "production";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toLowerTrim = (value = "") => String(value || "").trim().toLowerCase();

const safeString = (value = "") => String(value || "").trim();

const createId = () => crypto.randomUUID();

const requireSecret = (name, value) => {
  if (!value) {
    throw createHttpError(500, `${name} is not configured`);
  }

  return value;
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

const calculateRefreshExpiry = () =>
  new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const resolveUserModel = (roleSource = "") => {
  const normalizedSource = String(roleSource || "").trim().toUpperCase();

  if (
    ["CRM", "ADMIN", "FSE", "STATE_MANAGER", "ZONAL_MANAGER", "LEAD_GENERATOR", "APPROVER", "NATIONAL_SALES_HEAD"].includes(
      normalizedSource,
    )
  ) {
    return "CrmUser";
  }

  return "User";
};

const parseCookieHeader = (cookieHeader = "") =>
  String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      accumulator[key] = value;
      return accumulator;
    }, {});

const getCookieValue = (req, name) => {
  if (!name) {
    return "";
  }

  const parsedCookies = parseCookieHeader(req.headers?.cookie || "");
  return String(parsedCookies[name] || "").trim();
};

const resolveUserDoc = async ({ email = "", userId = "", userModel = "" }) => {
  const normalizedEmail = toLowerTrim(email);

  if (normalizedEmail) {
    const [user, crmUser] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      CrmUser.findOne({ email: normalizedEmail }),
    ]);

    return user || crmUser || null;
  }

  if (userId && userModel === "CrmUser") {
    return CrmUser.findById(userId);
  }

  if (userId) {
    return User.findById(userId);
  }

  return null;
};

const buildAuthUser = (doc, source) => {
  if (!doc) {
    return null;
  }

  const isCrm =
    String(source).toUpperCase() === "CRM" || Boolean(doc.fullName && !doc.name);
  const fullName = isCrm ? doc.fullName : doc.name || doc.fullName;

  return {
    id: String(doc._id),
    email: doc.email,
    fullName,
    name: doc.name || fullName,
    role: doc.role,
    source: isCrm ? "CRM" : "USER",
    accessStatus: doc.accessStatus || "ACTIVE",
    isActive: Boolean(doc.isActive),
    department: doc.department || "",
    scope: doc.scope || doc.territory || doc.state || "",
    territory: doc.territory || "",
    state: doc.state || "",
    phone: doc.phone || "",
    profileImage: doc.profileImageUrl || "",
  };
};

const signAccessToken = ({ userId, userModel, role, source, sessionId }) =>
  jwt.sign(
    {
      typ: "access",
      sub: String(userId),
      userModel,
      role,
      source,
      sid: sessionId,
    },
    requireSecret("JWT_SECRET", process.env.JWT_SECRET),
    { expiresIn: ACCESS_TOKEN_TTL },
  );

const signRefreshToken = ({
  userId,
  userModel,
  role,
  source,
  sessionId,
  refreshTokenFamily,
  tokenId,
}) =>
  jwt.sign(
    {
      typ: "refresh",
      sub: String(userId),
      userModel,
      role,
      source,
      sid: sessionId,
      family: refreshTokenFamily,
    },
    requireSecret("JWT_REFRESH_SECRET or JWT_SECRET", REFRESH_SECRET),
    {
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
      jwtid: tokenId,
    },
  );

const buildCookieOptions = ({ maxAge = true } = {}) => {
  const requestedSameSite = String(process.env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase();
  const sameSite = ["strict", "lax", "none"].includes(requestedSameSite)
    ? requestedSameSite
    : "lax";

  const options = {
    httpOnly: true,
    secure: isProduction || sameSite === "none",
    sameSite,
    path: "/",
  };

  if (maxAge) {
    options.maxAge = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  return options;
};

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, buildCookieOptions());
};

const clearAuthCookies = (res) => {
  const cookieOptions = buildCookieOptions({ maxAge: false });

  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions);
};

const extractRefreshToken = (req, { allowUnsafeFallback = !isProduction } = {}) => {
  const fromCookie = getCookieValue(req, REFRESH_COOKIE_NAME);
  if (fromCookie) {
    return fromCookie;
  }

  if (!allowUnsafeFallback) {
    return "";
  }

  const headerToken = String(req.headers["x-refresh-token"] || "").trim();
  if (headerToken) {
    return headerToken;
  }

  const bodyToken = String(req.body?.refreshToken || "").trim();
  return bodyToken;
};

const extractAccessToken = (req) => {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookieToken = getCookieValue(req, ACCESS_COOKIE_NAME);
  if (cookieToken) {
    return cookieToken;
  }

  return "";
};

const persistAuthSession = async ({
  user,
  userModel,
  sessionId,
  refreshTokenFamily,
  tokenId,
  refreshToken,
  req,
}) => {
  const ipAddress = String(req.ip || req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const userAgent = safeString(req.headers["user-agent"]);
  const deviceId = hashToken(`${userAgent}:${ipAddress || "unknown"}`).slice(0, 32);
  const expiresAt = calculateRefreshExpiry();

  await Session.create({
    sessionId,
    userId: user._id,
    userModel,
    userRole: user.role,
    deviceId,
    ipAddress,
    userAgent,
    refreshTokenFamily,
    isActive: true,
    revokedAt: null,
    revokedReason: "",
    lastSeenAt: new Date(),
    expiresAt,
  });

  await RefreshToken.create({
    tokenId,
    tokenHash: hashToken(refreshToken),
    userId: user._id,
    userModel,
    userRole: user.role,
    sessionId,
    refreshTokenFamily,
    deviceId,
    ipAddress,
    userAgent,
    expiresAt,
    revokedAt: null,
    revokedReason: "",
    replacedByTokenId: "",
    lastUsedAt: new Date(),
  });
};

const issueTokenPair = async ({
  user,
  source,
  req,
  sessionId = createId(),
  refreshTokenFamily = createId(),
  tokenId = createId(),
  persistSession = true,
}) => {
  const userModel = resolveUserModel(source);

  const accessToken = signAccessToken({
    userId: user._id,
    userModel,
    role: user.role,
    source,
    sessionId,
  });

  const refreshToken = signRefreshToken({
    userId: user._id,
    userModel,
    role: user.role,
    source,
    sessionId,
    refreshTokenFamily,
    tokenId,
  });

  if (persistSession) {
    await persistAuthSession({
      user,
      userModel,
      sessionId,
      refreshTokenFamily,
      tokenId,
      refreshToken,
      req,
    });
  }

  return {
    accessToken,
    refreshToken,
    sessionId,
    refreshTokenFamily,
    tokenId,
    user: buildAuthUser(user, source),
    expiresInSeconds: 15 * 60,
  };
};

const revokeSession = async ({ sessionId, reason = "logout", replacementTokenId = "" }) => {
  if (!sessionId) {
    return;
  }

  await Promise.all([
    Session.updateMany(
      { sessionId },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
    ),
    RefreshToken.updateMany(
      { sessionId },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: reason,
          replacedByTokenId: replacementTokenId,
        },
      },
    ),
  ]);
};

const revokeRefreshTokenById = async ({
  tokenId,
  reason = "revoked",
  replacementTokenId = "",
}) => {
  if (!tokenId) {
    return null;
  }

  return RefreshToken.findOneAndUpdate(
    { tokenId },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
        replacedByTokenId: replacementTokenId,
      },
    },
    { returnDocument: "after" },
  );
};

const verifyAccessToken = (token) => {
  if (!token) {
    throw createHttpError(401, "Authentication required");
  }

  const payload = jwt.verify(token, requireSecret("JWT_SECRET", process.env.JWT_SECRET));
  if (payload.typ !== "access" || !payload.sub || !payload.sid) {
    throw createHttpError(401, "Invalid access token");
  }

  return payload;
};

const verifyRefreshToken = (token) => {
  if (!token) {
    throw createHttpError(401, "Refresh token required");
  }

  const payload = jwt.verify(token, requireSecret("JWT_REFRESH_SECRET or JWT_SECRET", REFRESH_SECRET));
  if (!payload.typ || payload.typ !== "refresh" || !payload.sub || !payload.sid || !payload.family) {
    throw createHttpError(401, "Invalid refresh token");
  }

  return payload;
};

const resolveSessionContext = async ({
  userId,
  userModel,
  sessionId,
  tokenId,
  refreshToken,
}) => {
  const [session, tokenRecord] = await Promise.all([
    Session.findOne({ sessionId, userId, userModel }),
    RefreshToken.findOne({ tokenId, sessionId, userId, userModel }),
  ]);

  if (!session || !tokenRecord) {
    throw createHttpError(401, "Session expired");
  }

  if (!session.isActive || session.revokedAt) {
    throw createHttpError(401, "Session revoked");
  }

  if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
    throw createHttpError(401, "Session expired");
  }

  if (tokenRecord.revokedAt) {
    await revokeSession({ sessionId, reason: "refresh_token_revoked" });
    throw createHttpError(401, "Refresh token revoked");
  }

  if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() <= Date.now()) {
    await revokeSession({ sessionId, reason: "refresh_token_expired" });
    throw createHttpError(401, "Refresh token expired");
  }

  if (session.refreshTokenFamily !== tokenRecord.refreshTokenFamily && tokenRecord.refreshTokenFamily) {
    await revokeSession({ sessionId, reason: "refresh_token_family_mismatch" });
    throw createHttpError(401, "Refresh token mismatch");
  }

  if (tokenRecord.tokenHash !== hashToken(refreshToken)) {
    await revokeSession({ sessionId, reason: "refresh_token_tampered" });
    throw createHttpError(401, "Refresh token mismatch");
  }

  const user = await resolveUserDoc({ userId, userModel });
  if (!user) {
    await revokeSession({ sessionId, reason: "account_missing" });
    throw createHttpError(401, "Account no longer exists");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    await revokeSession({ sessionId, reason: "account_inactive" });
    throw createHttpError(403, "Account is inactive");
  }

  return {
    user,
    session,
    tokenRecord,
  };
};

const rotateRefreshToken = async ({ refreshToken, req }) => {
  const payload = verifyRefreshToken(refreshToken);
  const tokenId = String(payload.jti || "");
  const userModel = String(payload.userModel || "");
  const sessionId = String(payload.sid || "");
  const userId = String(payload.sub || "");
  const source = String(payload.source || (userModel === "CrmUser" ? "CRM" : "USER")).toUpperCase();

  const context = await resolveSessionContext({
    userId,
    userModel,
    sessionId,
    tokenId,
    refreshToken,
  });

  const nextTokenId = createId();
  const nextExpiresAt = calculateRefreshExpiry();
  const nextRefreshToken = await issueTokenPair({
    user: context.user,
    source,
    req,
    sessionId,
    refreshTokenFamily: String(payload.family),
    tokenId: nextTokenId,
    persistSession: false,
  });

  await Promise.all([
    Session.updateOne(
      { sessionId },
      {
        $set: {
          lastSeenAt: new Date(),
          expiresAt: nextExpiresAt,
          revokedAt: null,
          revokedReason: "",
        },
      },
    ),
    RefreshToken.updateOne(
      { tokenId },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: "rotated",
          replacedByTokenId: nextTokenId,
          lastUsedAt: new Date(),
        },
      },
    ),
    RefreshToken.create({
      tokenId: nextTokenId,
      tokenHash: hashToken(nextRefreshToken.refreshToken),
      userId: context.user._id,
      userModel,
      userRole: context.user.role,
      sessionId,
      refreshTokenFamily: String(payload.family),
      deviceId: context.tokenRecord.deviceId,
      ipAddress: context.tokenRecord.ipAddress,
      userAgent: context.tokenRecord.userAgent,
      expiresAt: nextExpiresAt,
      revokedAt: null,
      revokedReason: "",
      replacedByTokenId: "",
      lastUsedAt: new Date(),
    }),
  ]);

  return {
    ...nextRefreshToken,
    sessionId,
  };
};

const revokeSessionFromRefreshToken = async ({
  refreshToken,
  reason = "logout",
} = {}) => {
  if (!refreshToken) {
    return null;
  }

  const decoded = jwt.decode(refreshToken);
  const sessionId = String(decoded?.sid || "");
  const tokenId = String(decoded?.jti || "");

  if (sessionId) {
    await revokeSession({ sessionId, reason });
    return { sessionId, tokenId };
  }

  if (!tokenId) {
    return null;
  }

  const tokenRecord = await revokeRefreshTokenById({ tokenId, reason });
  if (tokenRecord?.sessionId) {
    await revokeSession({ sessionId: tokenRecord.sessionId, reason });
    return { sessionId: tokenRecord.sessionId, tokenId };
  }

  return { sessionId: "", tokenId };
};

const validateSession = async ({ accessToken }) => {
  const payload = verifyAccessToken(accessToken);
  const userModel = String(payload.userModel || "");
  const userId = String(payload.sub || "");
  const sessionId = String(payload.sid || "");

  const [session, user] = await Promise.all([
    Session.findOne({ sessionId, userId, userModel }),
    resolveUserDoc({ userId, userModel }),
  ]);

  if (
    !session ||
    !session.isActive ||
    (session.expiresAt && session.expiresAt.getTime() <= Date.now())
  ) {
    throw createHttpError(401, "Session expired");
  }

  if (!user) {
    throw createHttpError(401, "Account no longer exists");
  }

  if (!user.isActive || user.accessStatus === "RESTRICTED") {
    throw createHttpError(403, "Account is inactive");
  }

  return {
    user,
    session,
    payload,
    source: payload.source || (userModel === "CrmUser" ? "CRM" : "USER"),
  };
};

module.exports = {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_DAYS,
  buildAuthUser,
  buildCookieOptions,
  calculateRefreshExpiry,
  clearAuthCookies,
  clearRefreshCookie: clearAuthCookies,
  extractAccessToken,
  extractRefreshToken,
  hashToken,
  issueTokenPair,
  parseCookieHeader,
  revokeRefreshTokenById,
  revokeSession,
  revokeSessionFromRefreshToken,
  rotateRefreshToken,
  setRefreshCookie,
  validateSession,
  verifyAccessToken,
  verifyRefreshToken,
};
