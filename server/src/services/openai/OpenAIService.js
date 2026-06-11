let OpenAI = null;
try {
  OpenAI = require("openai");
} catch (e) {
  // Allow server to boot even if openai dependency isn't installed yet.
  OpenAI = null;
}

let client = null;
let lastInitError = null;

const getOpenAIClient = () => {
  // Lazy init so server can boot without OPENAI key yet.
  if (client) return client;
  if (lastInitError) throw lastInitError;

  if (!OpenAI) {
    lastInitError = new Error("OpenAI SDK is not available (missing `openai` dependency).");
    throw lastInitError;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    lastInitError = new Error("OpenAI is not configured yet (OPENAI_API_KEY missing).");
    throw lastInitError;
  }

  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 60000);

  client = new OpenAI({
    apiKey,
    timeout: timeoutMs,
  });

  return client;
};

const isReducedMotion = () => {
  // placeholder util (not used)
  return false;
};

class OpenAIService {
  async createChatCompletion({ model, systemPrompt, userPrompt, maxOutputTokens = 600 }) {
    const openai = getOpenAIClient();

    // Use Responses API in GPT-5+ style; if not supported, it will fail fast in this method.
    // (Can be adjusted later once your OpenAI client/server standard is finalized.)
    const requestOptions = {
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      max_output_tokens: maxOutputTokens,
    };

    return openai.responses.create(requestOptions);
  }

  async getSafeChatbotFallbackResponse() {
    return {
      outputText:
        "Chatbot is not configured yet. Please try again later.",
      raw: null,
      usage: { total_tokens: 0 },
      model: process.env.OPENAI_MODEL || "gpt-unknown",
      success: false,
    };
  }
}

module.exports = new OpenAIService();
