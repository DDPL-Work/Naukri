const NotificationPreferences = require("../models/NotificationPreferences");
const User = require("../models/User");

const PLAN_DEFAULTS = {
  FREE: { jobRecommendationsEnabled: false, recommendationFrequency: "disabled" },
  PRO: { jobRecommendationsEnabled: true, recommendationFrequency: "daily" },
  ELITE: { jobRecommendationsEnabled: true, recommendationFrequency: "twice_daily" },
};

async function getPreferences(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let prefs = await NotificationPreferences.findOne({ userId, role });
    if (!prefs) {
      const user = await User.findById(userId).select("membership.plan").lean();
      const plan = (user?.membership?.plan) || "FREE";
      const defaults = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.FREE;
      prefs = await NotificationPreferences.create({ userId, role, ...defaults });
    }
    res.status(200).json({ success: true, data: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get preferences", error: error.message });
  }
}

async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const allowed = ["applicationUpdates", "marketingEmails", "jobRecommendations", "jobRecommendationsEnabled", "recommendationFrequency", "blogUpdates"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        if (field === "recommendationFrequency") {
          updates[field] = req.body[field];
        } else {
          updates[field] = Boolean(req.body[field]);
        }
      }
    }
    const prefs = await NotificationPreferences.findOneAndUpdate(
      { userId, role },
      { $set: updates },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update preferences", error: error.message });
  }
}

module.exports = { getPreferences, updatePreferences };
