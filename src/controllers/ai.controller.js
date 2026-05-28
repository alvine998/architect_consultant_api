const { createChatCompletion, generateImage } = require("../utils/bigmodel");
const AiUsage = require("../models/ai_usage.model");
const User = require("../models/user.model");
const sequelize = require("../config/db");

const ALLOWED_MESSAGE_ROLES = new Set(["system", "user", "assistant", "tool"]);
const MAX_IMAGE_REQUESTS_PER_DAY = 1;
const DEFAULT_ALLOWED_TOPICS = [
  "architecture",
  "architectural consultation",
  "building design",
  "interior design",
  "construction",
  "renovation",
  "materials",
  "space planning",
  "landscape design",
  "cost estimation",
  "permits",
  "property development",
];
const TOPIC_KEYWORDS = [
  "architecture",
  "architect",
  "building",
  "build",
  "house",
  "home",
  "villa",
  "room",
  "kitchen",
  "bathroom",
  "bedroom",
  "interior",
  "exterior",
  "facade",
  "floor plan",
  "layout",
  "renovation",
  "construction",
  "contractor",
  "material",
  "granite",
  "marble",
  "tile",
  "wood",
  "concrete",
  "steel",
  "roof",
  "wall",
  "door",
  "window",
  "garden",
  "landscape",
  "budget",
  "cost",
  "permit",
  "property",
  "design",
];

const getEndUserId = (req) => `user-${req.userId}`;

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const getJakartaDate = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getDefaultMaxOutputTokens = () => {
  const value = parseNumber(process.env.BIGMODEL_MAX_OUTPUT_TOKENS);
  return value && value > 0 ? Math.floor(value) : 1024;
};

const getAllowedTopics = () => {
  if (!process.env.AI_ALLOWED_TOPICS) return DEFAULT_ALLOWED_TOPICS;

  return process.env.AI_ALLOWED_TOPICS
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
};

const getRequestedMaxOutputTokens = (body) => {
  if (Array.isArray(body)) return undefined;

  return (
    body.max_output_tokens ??
    body.output_tokens ??
    body.output_token ??
    body.max_tokens
  );
};

const getTokenUsage = (usage = {}) => {
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || inputTokens + outputTokens;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
  };
};

const extractJsonObject = (text) => {
  if (!text) return null;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (err) {
    return null;
  }
};

const getLatestUserMessage = (messages) => {
  return [...messages].reverse().find((message) => message.role === "user");
};

const getRecentUserMessagesText = (messages) => {
  return messages
    .filter((message) => message.role === "user")
    .slice(-8)
    .map((message) => message.content)
    .join("\n")
    .slice(-4000);
};

const getTopicClassificationText = (messages) => {
  const latestUserMessage = getLatestUserMessage(messages);
  if (latestUserMessage) return latestUserMessage.content.slice(-4000);

  return getRecentUserMessagesText(messages);
};

const classifyTopicLocally = (text, allowedTopics, reasonPrefix = "Matched architecture-related keyword") => {
  const normalizedText = text.toLowerCase();
  const matchedKeyword = TOPIC_KEYWORDS.find((keyword) => normalizedText.includes(keyword));

  if (!matchedKeyword) return null;

  const matchedTopic = allowedTopics.find((topic) => {
    return normalizedText.includes(topic.toLowerCase());
  });

  return {
    allowed: true,
    topic: matchedTopic || "architecture",
    reason: `${reasonPrefix}: ${matchedKeyword}`,
    allowed_topics: allowedTopics,
    classifier: "local",
  };
};

const classifyChatTopic = async (messages) => {
  const allowedTopics = getAllowedTopics();
  const userText = getTopicClassificationText(messages);
  const localClassification = classifyTopicLocally(userText, allowedTopics);

  if (localClassification) {
    return localClassification;
  }

  const recentUserText = getRecentUserMessagesText(messages);
  const recentLocalClassification = classifyTopicLocally(
    recentUserText,
    allowedTopics,
    "Matched recent architecture-related context"
  );

  if (recentLocalClassification) {
    return recentLocalClassification;
  }

  const data = await createChatCompletion({
    model: process.env.BIGMODEL_TOPIC_CLASSIFIER_MODEL || process.env.BIGMODEL_CHAT_MODEL || "glm-5.1",
    messages: [
      {
        role: "system",
        content: [
          "You are a strict topic classifier for an architecture consultant app.",
          "Decide whether the user's request is mainly related to the allowed topics.",
          "Return only JSON with this shape:",
          '{"allowed":true,"topic":"matched topic","reason":"short reason"}',
          `Allowed topics: ${allowedTopics.join(", ")}.`,
          "If the request is unrelated, casual small talk, coding, politics, medical, legal, finance, adult content, or any other topic outside the allowed list, set allowed to false.",
        ].join(" "),
      },
      {
        role: "user",
        content: recentUserText || userText,
      },
    ],
    max_tokens: 120,
    temperature: 0,
    stream: false,
  });

  const content = data?.choices?.[0]?.message?.content || "";
  const classification = extractJsonObject(content);

  if (!classification || typeof classification.allowed !== "boolean") {
    return {
      allowed: false,
      topic: null,
      reason: "Topic classifier could not confirm this request is related to architecture consultation.",
      allowed_topics: allowedTopics,
      classifier: "bigmodel",
      classifier_response: content,
    };
  }

  return {
    allowed: classification.allowed,
    topic: classification.topic || null,
    reason: classification.reason || null,
    allowed_topics: allowedTopics,
    classifier: "bigmodel",
  };
};

const consumeDailyAiQuota = async (req, type) => {
  const user = await User.findByPk(req.userId, {
    attributes: ["id", "chat_limit"],
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const dailyLimit = user.chat_limit || 10;
  const ipaddress = getClientIp(req);
  const usageDate = getJakartaDate();

  return sequelize.transaction(async (transaction) => {
    const [usage] = await AiUsage.findOrCreate({
      where: {
        user_id: req.userId,
        ipaddress,
        usage_date: usageDate,
      },
      defaults: {
        user_id: req.userId,
        ipaddress,
        usage_date: usageDate,
        request_count: 0,
        chat_count: 0,
        image_count: 0,
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (usage.request_count >= dailyLimit) {
      const error = new Error(`Daily AI request limit reached. Maximum ${dailyLimit} requests per user per IP per day.`);
      error.statusCode = 429;
      error.quota = {
        date: usageDate,
        ipaddress,
        limit: dailyLimit,
        used: usage.request_count,
        remaining: 0,
        image_limit: MAX_IMAGE_REQUESTS_PER_DAY,
        image_used: usage.image_count,
        image_remaining: Math.max(0, MAX_IMAGE_REQUESTS_PER_DAY - usage.image_count),
      };
      throw error;
    }

    if (type === "image" && usage.image_count >= MAX_IMAGE_REQUESTS_PER_DAY) {
      const error = new Error("Daily image generation limit reached. Maximum 1 image request per user per IP per day.");
      error.statusCode = 429;
      error.quota = {
        date: usageDate,
        ipaddress,
        limit: dailyLimit,
        used: usage.request_count,
        remaining: Math.max(0, dailyLimit - usage.request_count),
        image_limit: MAX_IMAGE_REQUESTS_PER_DAY,
        image_used: usage.image_count,
        image_remaining: 0,
      };
      throw error;
    }

    usage.request_count += 1;
    if (type === "image") {
      usage.image_count += 1;
    } else {
      usage.chat_count += 1;
    }

    await usage.save({ transaction });

    return {
      date: usageDate,
      ipaddress,
      limit: dailyLimit,
      used: usage.request_count,
      remaining: Math.max(0, dailyLimit - usage.request_count),
      image_limit: MAX_IMAGE_REQUESTS_PER_DAY,
      image_used: usage.image_count,
      image_remaining: Math.max(0, MAX_IMAGE_REQUESTS_PER_DAY - usage.image_count),
    };
  });
};

const isValidMessage = (message) => {
  return (
    message &&
    ALLOWED_MESSAGE_ROLES.has(message.role) &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
};

const buildMessages = (body) => {
  if (Array.isArray(body)) {
    if (body.length === 0 || !body.every(isValidMessage)) {
      return null;
    }

    return body.map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }));
  }

  const { message, messages, system } = body;

  if (Array.isArray(messages)) {
    if (messages.length === 0 || !messages.every(isValidMessage)) {
      return null;
    }

    return messages.map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }));
  }

  if (typeof message !== "string" || !message.trim()) {
    return null;
  }

  const chatMessages = [];

  if (typeof system === "string" && system.trim()) {
    chatMessages.push({ role: "system", content: system.trim() });
  }

  chatMessages.push({ role: "user", content: message.trim() });
  return chatMessages;
};

const getBigModelErrorPayload = (err) => {
  const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
  const payload = { message: err.message };

  if (err.details) {
    payload.details = err.details;
  }

  if (err.quota) {
    payload.quota = err.quota;
  }

  if (err.topic) {
    payload.topic = err.topic;
  }

  return { status, payload };
};

const chat = async (req, res) => {
  try {
    const messages = buildMessages(req.body);
    const options = Array.isArray(req.body) ? {} : req.body;

    if (!messages) {
      return res.status(400).json({
        message: "Send either message as a non-empty string or messages as a valid chat history",
      });
    }

    const payload = {
      model: options.model || process.env.BIGMODEL_CHAT_MODEL || "glm-5.1",
      messages,
      max_tokens: getDefaultMaxOutputTokens(),
      stream: false,
      user_id: getEndUserId(req),
    };

    if (options.temperature !== undefined) {
      const temperature = parseNumber(options.temperature);
      if (temperature === null || temperature < 0 || temperature > 1) {
        return res.status(400).json({ message: "temperature must be a number between 0 and 1" });
      }

      payload.temperature = temperature;
    }

    const requestedMaxOutputTokens = getRequestedMaxOutputTokens(options);
    if (requestedMaxOutputTokens !== undefined) {
      const maxTokens = parseNumber(requestedMaxOutputTokens);
      if (maxTokens === null || maxTokens < 1) {
        return res.status(400).json({
          message: "max_output_tokens must be a positive number",
        });
      }

      payload.max_tokens = Math.floor(maxTokens);
    }

    const topic = await classifyChatTopic(messages);
    if (!topic.allowed) {
      return res.status(403).json({
        message: "This chat is outside the allowed topic for this assistant.",
        topic,
      });
    }

    const quota = await consumeDailyAiQuota(req, "chat");
    const data = await createChatCompletion(payload);
    const assistantMessage = data?.choices?.[0]?.message || null;

    res.json({
      message: assistantMessage?.content || "",
      assistant: assistantMessage,
      model: data?.model,
      usage: data?.usage,
      tokens: getTokenUsage(data?.usage),
      max_output_tokens: payload.max_tokens,
      topic,
      quota,
      request_id: data?.request_id,
      content_filter: data?.content_filter,
    });
  } catch (err) {
    const { status, payload } = getBigModelErrorPayload(err);
    res.status(status).json(payload);
  }
};

const image = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const payload = {
      model: req.body.model || process.env.BIGMODEL_IMAGE_MODEL || "glm-image",
      prompt: prompt.trim(),
      size: req.body.size || "1280x1280",
      user_id: getEndUserId(req),
    };

    if (req.body.quality) {
      payload.quality = req.body.quality;
    }

    if (req.body.watermark_enabled !== undefined) {
      payload.watermark_enabled = parseBoolean(req.body.watermark_enabled);
    }

    const quota = await consumeDailyAiQuota(req, "image");
    const data = await generateImage(payload);

    res.json({
      images: Array.isArray(data?.data) ? data.data.map((item) => item.url).filter(Boolean) : [],
      data: data?.data || [],
      created: data?.created,
      quota,
      content_filter: data?.content_filter,
    });
  } catch (err) {
    const { status, payload } = getBigModelErrorPayload(err);
    res.status(status).json(payload);
  }
};

module.exports = { chat, image };
