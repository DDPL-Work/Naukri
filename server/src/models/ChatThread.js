const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
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
    candidateName: { type: String, default: "" },
    candidateEmail: { type: String, default: "" },
    candidateTitle: { type: String, default: "" },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,
    },
    jobTitle: { type: String, default: "" },
    lastMessageText: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null, index: true },
    lastSenderRole: { type: String, enum: ["COMPANY", "CANDIDATE", "SYSTEM"], default: "SYSTEM" },
    companyUnreadCount: { type: Number, default: 0 },
    candidateUnreadCount: { type: Number, default: 0 },
    activeCall: {
      state: { type: String, enum: ["IDLE", "RINGING", "IN_CALL"], default: "IDLE" },
      mediaType: { type: String, enum: ["AUDIO", "VIDEO"], default: "AUDIO" },
      initiatedBy: { type: String, enum: ["COMPANY", "CANDIDATE", "SYSTEM"], default: "SYSTEM" },
      startedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

chatThreadSchema.index({ companyId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model("ChatThread", chatThreadSchema);
