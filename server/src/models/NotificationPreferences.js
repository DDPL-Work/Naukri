const mongoose = require("mongoose");

const notificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["CANDIDATE", "RECRUITER", "ADMIN", "CRM", "FSE", "CLIENT"],
      required: true,
    },
    applicationUpdates: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: true },
    jobRecommendations: { type: Boolean, default: true },
    blogUpdates: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationPreferencesSchema.index({ userId: 1, role: 1 }, { unique: true });

module.exports = mongoose.model("NotificationPreferences", notificationPreferencesSchema);
