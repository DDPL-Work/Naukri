const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
      index: true,
    },
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
    senderRole: {
      type: String,
      enum: ["COMPANY", "CANDIDATE", "SYSTEM"],
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
      default: null,
    },
    senderModel: { type: String, enum: ["User"], default: "User" },
    type: {
      type: String,
      enum: ["TEXT", "ATTACHMENT", "SYSTEM", "CALL"],
      default: "TEXT",
    },
    text: { type: String, default: "" },
    attachments: [
      {
        type: {
          type: String,
          default: "FILE",
        },
        url: { type: String, default: "" },
        name: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
      },
    ],
    readAt: { type: Date, default: null },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

chatMessageSchema.index({ threadId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
