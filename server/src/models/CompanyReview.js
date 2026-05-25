const mongoose = require("mongoose");

const companyReviewSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      default: "",
      trim: true,
    },
    candidateTitle: {
      type: String,
      default: "",
      trim: true,
    },
    candidateCity: {
      type: String,
      default: "",
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    headline: {
      type: String,
      default: "",
      trim: true,
    },
    review: {
      type: String,
      default: "",
      trim: true,
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["PUBLISHED", "PENDING", "HIDDEN"],
      default: "PUBLISHED",
      index: true,
    },
  },
  { timestamps: true },
);

companyReviewSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("CompanyReview", companyReviewSchema);
