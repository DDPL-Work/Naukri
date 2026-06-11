const mongoose = require("mongoose");

const chatBotMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatBotThread", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    senderRole: {
      type: String,
      enum: ["USER", "BOT", "SYSTEM"],
      required: true,
      index: true,
    },

    senderId: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel", default: null },
    senderModel: { type: String, enum: ["User"], default: "User" },

    type: { type: String, enum: ["TEXT"], default: "TEXT" },

    text: { type: String, default: "" },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

chatBotMessageSchema.index({ threadId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatBotMessage", chatBotMessageSchema);
