const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CrmUser = require("../models/CrmUser");
const { extractAccessToken, validateSession } = require("../services/auth.service");

const extractToken = (req) => {
  const sessionToken = extractAccessToken(req);
  if (sessionToken) {
    return sessionToken;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.split(" ")[1];
};

const reject = (res, statusCode, message) =>
  res.status(statusCode).json({
    success: false,
    message,
  });

exports.protectCandidate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return reject(res, 401, "Candidate authentication required");
    }

    try {
      const session = await validateSession({ accessToken: token });

      if (session.source !== "USER" || session.user.role !== "CANDIDATE") {
        return reject(res, 401, "Invalid candidate session");
      }

      req.user = session.user;
      req.auth = {
        sessionId: session.session?.sessionId || "",
        source: session.source,
        payload: session.payload,
      };
      next();
      return;
    } catch (error) {
      if (error.statusCode !== 401) {
        throw error;
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.role !== "CANDIDATE") {
      return reject(res, 401, "Invalid candidate session");
    }

    if (!user.isActive || user.accessStatus === "RESTRICTED") {
      return reject(res, 403, "Candidate account is inactive");
    }

    req.user = user;
    next();
  } catch {
    return reject(res, 401, "Unauthorized access");
  }
};

exports.protectCandidateManagers = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return reject(res, 401, "Authentication required");
    }

    try {
      const session = await validateSession({ accessToken: token });

      if (session.source === "CRM") {
        req.user = session.user;
        req.accessContext = "CRM";
        req.auth = {
          sessionId: session.session?.sessionId || "",
          source: session.source,
          payload: session.payload,
        };
        next();
        return;
      }

      if (!["ADMIN", "CRM"].includes(session.user.role)) {
        return reject(res, 403, "Only Admin and CRM can access candidate exports");
      }

      req.user = session.user;
      req.accessContext = session.user.role;
      req.auth = {
        sessionId: session.session?.sessionId || "",
        source: session.source,
        payload: session.payload,
      };
      next();
      return;
    } catch (error) {
      if (error.statusCode !== 401) {
        throw error;
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === "CRM_PANEL") {
      const crmUser = await CrmUser.findById(decoded.id).select("-password");

      if (!crmUser || !crmUser.isActive || crmUser.accessStatus === "RESTRICTED") {
        return reject(res, 403, "CRM access is inactive");
      }

      req.user = crmUser;
      req.accessContext = "CRM";
      next();
      return;
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return reject(res, 401, "Invalid session");
    }

    if (!["ADMIN", "CRM"].includes(user.role)) {
      return reject(res, 403, "Only Admin and CRM can access candidate exports");
    }

    req.user = user;
    req.accessContext = user.role;
    next();
  } catch {
    return reject(res, 401, "Unauthorized access");
  }
};
