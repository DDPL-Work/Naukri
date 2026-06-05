const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CrmUser = require("../models/CrmUser");
const { extractAccessToken, validateSession } = require("../services/auth.service");

const resolveAdminFromToken = async (tokenPayload) => {
  const preferredSource = tokenPayload.type === "CRM" ? "CRM" : "USER";
  const fallbacks =
    preferredSource === "CRM"
      ? [
          { source: "CRM", model: CrmUser },
          { source: "USER", model: User },
        ]
      : [
          { source: "USER", model: User },
          { source: "CRM", model: CrmUser },
        ];

  for (const target of fallbacks) {
    const account = await target.model.findById(tokenPayload.id).select("-password");

    if (account) {
      return {
        account,
        source: target.source,
      };
    }
  }

  return null;
};

const protectAdmin = async (req, res, next) => {
  try {
    const sessionToken = extractAccessToken(req);

    if (sessionToken) {
      try {
        const session = await validateSession({ accessToken: sessionToken });

        if (session.user.role !== "ADMIN") {
          return res.status(403).json({
            success: false,
            message: "Admin access required",
          });
        }

        req.user = session.user;
        req.auth = {
          sessionId: session.session?.sessionId || "",
          source: session.source,
          payload: session.payload,
        };
        req.adminSource = session.source;
        next();
        return;
      } catch (error) {
        if (error.statusCode !== 401) {
          throw error;
        }
      }
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const resolved = await resolveAdminFromToken(decoded);

    if (!resolved) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const { account, source } = resolved;

    if (!account.isActive || account.accessStatus === "RESTRICTED") {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive",
      });
    }

    if (account.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.user = account;
    req.adminSource = source;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

module.exports = {
  protectAdmin,
};
