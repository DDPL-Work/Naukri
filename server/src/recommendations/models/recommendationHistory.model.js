const mongoose = require("mongoose");

const recommendationHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    emailSentAt: { type: Date, default: Date.now },
    emailMessageId: { type: String, default: "" },
    recommendationType: {
      type: String,
      enum: ["pro", "elite", "weekly"],
      default: "pro",
    },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

recommendationHistorySchema.index({ userId: 1, jobId: 1 }, { unique: true });
recommendationHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("RecommendationHistory", recommendationHistorySchema);
