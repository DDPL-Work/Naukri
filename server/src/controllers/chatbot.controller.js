const ChatBotService = require("../services/openai/ChatBotService");

exports.getThreadMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const threadId = String(req.query.threadId || "").trim();

    const messages = await ChatBotService.listMessages({
      threadId,
      userId,
      limit: Number(req.query.limit || 50),
    });

    res.status(200).json({ success: true, data: { messages } });
  } catch (error) {
    next(error);
  }
};

exports.sendChatbotMessage = async (req, res, next) => {
  try {
    const threadId = String(req.body.threadId || "").trim();
    const text = req.body.text;

    const result = await ChatBotService.sendMessage({
      threadId,
      user: req.user,
      text,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
