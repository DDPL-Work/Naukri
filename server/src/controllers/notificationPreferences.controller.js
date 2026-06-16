const NotificationPreferences = require("../models/NotificationPreferences");

async function getPreferences(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let prefs = await NotificationPreferences.findOne({ userId, role });
    if (!prefs) {
      prefs = await NotificationPreferences.create({ userId, role });
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
    const allowed = ["applicationUpdates", "marketingEmails", "jobRecommendations", "blogUpdates"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = Boolean(req.body[field]);
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
