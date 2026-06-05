const jwt = require("jsonwebtoken");
const CrmUser = require("../models/CrmUser");
const { extractAccessToken, validateSession } = require("../services/auth.service");

const protectCrmPanel = async (req, res, next) => {
  try {
    const sessionToken = extractAccessToken(req);

    if (sessionToken) {
      try {
        const session = await validateSession({ accessToken: sessionToken });

        if (session.source !== "CRM") {
          return res.status(403).json({
            success: false,
            message: "CRM access required",
          });
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
    const user = await CrmUser.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (!user.isActive || user.accessStatus === "RESTRICTED") {
      return res.status(403).json({
        success: false,
        message: "CRM account is inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

module.exports = {
  protectCrmPanel,
};
