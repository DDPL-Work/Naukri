const asyncHandler = require("./async.middleware");
const { extractAccessToken, validateSession } = require("../services/auth.service");

const reject = (res, statusCode, message) =>
  res.status(statusCode).json({
    success: false,
    message,
  });

const resolveSession = async (req) => {
  const accessToken = extractAccessToken(req);
  if (!accessToken) {
    return null;
  }

  return validateSession({ accessToken });
};

exports.protectUser = asyncHandler(async (req, res, next) => {
  try {
    const session = await resolveSession(req);

    if (!session) {
      return reject(res, 401, "Authentication required");
    }

    if (session.source !== "USER") {
      return reject(res, 403, "User access required");
    }

    req.user = session.user;
    req.auth = {
      sessionId: session.session?.sessionId || "",
      source: session.source,
      payload: session.payload,
    };
    next();
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return reject(res, statusCode, error.message || "Unauthorized access");
  }
});

exports.protectCRM = asyncHandler(async (req, res, next) => {
  try {
    const session = await resolveSession(req);

    if (!session) {
      return reject(res, 401, "Authentication required");
    }

    if (session.source !== "CRM") {
      return reject(res, 403, "CRM access required");
    }

    req.user = session.user;
    req.auth = {
      sessionId: session.session?.sessionId || "",
      source: session.source,
      payload: session.payload,
    };
    next();
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return reject(res, statusCode, error.message || "Unauthorized access");
  }
});
