const mongoose = require("mongoose");

const recommendationClickSchema = new mongoose.Schema(
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
    recommendationHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecommendationHistory",
      default: null,
    },
    emailMessageId: { type: String, default: "" },
    clickedAt: { type: Date, default: Date.now },
    recommendationType: {
      type: String,
      enum: ["pro", "elite", "weekly"],
      default: "pro",
    },
    membershipPlan: {
      type: String,
      enum: ["FREE", "PRO", "ELITE"],
      default: "PRO",
    },
  },
  { timestamps: true }
);

recommendationClickSchema.index({ emailMessageId: 1 });
recommendationClickSchema.index({ userId: 1, clickedAt: -1 });
recommendationClickSchema.index({ jobId: 1 });

module.exports = mongoose.model("RecommendationClick", recommendationClickSchema);
