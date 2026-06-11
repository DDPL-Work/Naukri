const OpenAIService = require("./OpenAIService");
const PromptBuilder = require("./PromptBuilder");
const ChatBotThread = require("../../models/ChatBotThread");
const ChatBotMessage = require("../../models/ChatBotMessage");

class ChatBotService {
  /**
   * Ensure we have a valid thread for the user.
   * If threadId is missing/invalid, creates a new one.
   */
  async resolveThread({ userId, userRole, threadId }) {
    const nowThreadId =
      threadId && typeof threadId === "string" ? threadId.trim() : "";

    if (nowThreadId) {
      try {
        const existing = await ChatBotThread.findOne({ _id: nowThreadId, userId });
        if (existing) return existing;
      } catch (e) {
        // Invalid ObjectId or cast error -> treat as missing threadId
      }
    }

    const created = await ChatBotThread.create({
      userId,
      userRole: userRole || "CLIENT",
      title: "ChatBot",
      metadata: {},
    });

    return created;
  }

  async sendMessage({ threadId, user, text }) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      throw new Error("Message text is required");
    }

    const thread = await this.resolveThread({
      userId: user.id,
      userRole: user.role,
      threadId,
    });

    // Persist user message
    const userMsg = await ChatBotMessage.create({
      threadId: thread._id,
      userId: user.id,
      senderRole: "USER",
      senderId: user.id,
      senderModel: "User",
      type: "TEXT",
      text: trimmed,
      metadata: {},
    });

    // Prepare OpenAI prompts
    const systemPrompt = PromptBuilder.systemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(trimmed, {
      role: user.role || "unknown",
      language: user.language || "en",
    });

    // If OPENAI isn't configured, return fallback
    let botReply;
    try {
      const model = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || "gpt-5-nano";

      const response = await OpenAIService.createChatCompletion({
        model,
        systemPrompt,
        userPrompt,
        maxOutputTokens: Number(process.env.OPENAI_CHAT_MAX_OUTPUT_TOKENS || 400),
      });

      // Best-effort extraction: support both Responses API structures.
      // Responses usually has `output_text`, but fallback to best available text.
      botReply =
        response?.output_text ||
        response?.output?.[0]?.content?.[0]?.text ||
        response?.output?.[0]?.text ||
        "";

      botReply = String(botReply || "").trim();
    } catch (err) {
      botReply = (await OpenAIService.getSafeChatbotFallbackResponse()).outputText;
    }

    if (!botReply) {
      botReply = (await OpenAIService.getSafeChatbotFallbackResponse()).outputText;
    }

    // Persist bot message
    const botMsg = await ChatBotMessage.create({
      threadId: thread._id,
      userId: user.id,
      senderRole: "BOT",
      senderId: null,
      senderModel: "User",
      type: "TEXT",
      text: botReply,
      metadata: {
        model: process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || null,
      },
    });

    return {
      threadId: String(thread._id),
      userMessage: {
        id: String(userMsg._id),
        role: "USER",
        text: userMsg.text,
        createdAt: userMsg.createdAt,
      },
      botMessage: {
        id: String(botMsg._id),
        role: "BOT",
        text: botMsg.text,
        createdAt: botMsg.createdAt,
      },
    };
  }

  async listMessages({ threadId, userId, limit = 50 }) {
    const tId = String(threadId || "").trim();
    if (!tId) throw new Error("threadId is required");

    const thread = await ChatBotThread.findOne({ _id: tId, userId });
    if (!thread) throw new Error("Conversation not found");

    const messages = await ChatBotMessage.find({ threadId: tId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return messages.reverse();
  }
}

module.exports = new ChatBotService();
