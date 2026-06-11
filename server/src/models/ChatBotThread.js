const mongoose = require("mongoose");

const chatBotThreadSchema = new mongoose.Schema(
  {
    /**
     * Chatbot threads are per-user (candidate or company).
     * We store minimal context fields; context can be expanded later.
     */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: { type: String, enum: ["CLIENT", "CANDIDATE", "COMPANY"], default: "CLIENT", index: true },

    title: { type: String, default: "ChatBot" },

    // Optional metadata (e.g., selected persona, channel)
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Allow multiple threads per user (e.g., different sessions)
chatBotThreadSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatBotThread", chatBotThreadSchema);
