const logger = require("../../config/logger");

function isEligibleForRecommendations(user) {
  if (!user) {
    return { eligible: false, reason: "no_user" };
  }

  if (user.role !== "CANDIDATE") {
    return { eligible: false, reason: "not_candidate" };
  }

  if (!user.isActive) {
    return { eligible: false, reason: "user_inactive" };
  }

  if (!user.membership) {
    return { eligible: false, reason: "no_membership" };
  }

  if (!user.membership.active) {
    return { eligible: false, reason: "membership_inactive" };
  }

  if (user.membership.plan !== "PRO" && user.membership.plan !== "ELITE") {
    return { eligible: false, reason: "invalid_plan" };
  }

  if (!user.membership.expiresAt) {
    return { eligible: false, reason: "no_expiry_date" };
  }

  const now = new Date();
  const expiresAt = new Date(user.membership.expiresAt);
  if (expiresAt <= now) {
    return { eligible: false, reason: "membership_expired" };
  }

  return { eligible: true };
}

async function checkAndExpireMembership(User) {
  const now = new Date();
  const expired = await User.find({
    role: "CANDIDATE",
    "membership.active": true,
    "membership.expiresAt": { $lte: now, $ne: null },
  }).lean();

  for (const user of expired) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "membership.active": false,
          "membership.plan": "FREE",
        },
      }
    );
    logger.info(`[eligibility] Expired membership for user ${user._id}`, {
      userId: user._id,
      email: user.email ? user.email.slice(0, 3) + "***" : null,
      expiredAt: user.membership.expiresAt,
    });
  }

  return expired.length;
}

module.exports = { isEligibleForRecommendations, checkAndExpireMembership };
