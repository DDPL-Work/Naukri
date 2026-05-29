// chat.controller.js
const Application = require("../models/Application");
const CandidateNotification = require("../models/CandidateNotification");
const CandidateProfile = require("../models/CandidateProfile");
const ChatMessage = require("../models/ChatMessage");
const ChatThread = require("../models/ChatThread");
const Company = require("../models/Company");
const User = require("../models/User");
const mongoose = require("mongoose");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatRelativeTime = (value) => {
  if (!value) return "Just now";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const getInitials = (name = "Candidate") =>
  String(name || "Candidate")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "C";

const resolveCompanyContext = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user || user.role !== "CLIENT") {
    throw createHttpError(403, "Client access required");
  }

  if (!user.companyId) {
    throw createHttpError(403, "No company is linked to this account");
  }

  const company = await Company.findById(user.companyId);
  if (!company) {
    throw createHttpError(404, "Company not found");
  }

  return { user, company };
};

const resolveCandidateContext = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user || user.role !== "CANDIDATE") {
    throw createHttpError(403, "Candidate access required");
  }

  return { user };
};

const formatMessage = (message) => ({
  id: String(message._id),
  threadId: String(message.threadId),
  senderRole: message.senderRole,
  text: message.text || "",
  attachments: Array.isArray(message.attachments) ? message.attachments : [],
  createdAt: message.createdAt || null,
  lastUpdated: formatRelativeTime(message.updatedAt || message.createdAt),
  metadata: message.metadata || {},
});

const formatThread = (thread, { companyId, candidateId } = {}) => {
  const unreadCount =
    String(companyId || "") === String(thread.companyId || "")
      ? Number(thread.companyUnreadCount || 0)
      : Number(thread.candidateUnreadCount || 0);

  return {
    id: String(thread._id),
    companyId: String(thread.companyId),
    candidateId: String(thread.candidateId),
    candidateName: thread.candidateName || "Candidate",
    candidateEmail: thread.candidateEmail || "",
    candidateTitle: thread.candidateTitle || "",
    candidateAvatar: getInitials(thread.candidateName || "Candidate"),
    jobTitle: thread.jobTitle || "",
    jobId: thread.jobId ? String(thread.jobId) : "",
    applicationId: thread.applicationId ? String(thread.applicationId) : "",
    lastMessageText: thread.lastMessageText || "",
    lastMessageAt: thread.lastMessageAt || null,
    lastSenderRole: thread.lastSenderRole || "SYSTEM",
    unreadCount,
    activeCall: thread.activeCall || { state: "IDLE", mediaType: "AUDIO", initiatedBy: "SYSTEM" },
    time: formatRelativeTime(thread.lastMessageAt || thread.updatedAt || thread.createdAt),
  };
};

const ensureCompanyThreads = async (company) => {
  const applications = await Application.find({ companyId: company._id })
    .sort({ updatedAt: -1 })
    .populate("candidateId", "name email")
    .populate("jobId", "title");

  const candidateIds = applications
    .map((application) => application.candidateId?._id || application.candidateId)
    .filter(Boolean)
    .map((value) => String(value));

  const profiles = candidateIds.length
    ? await CandidateProfile.find({ userId: { $in: candidateIds } }).select(
        "userId currentTitle totalExperience currentCity",
      )
    : [];

  const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const threads = await ChatThread.find({
    companyId: company._id,
    candidateId: { $in: candidateIds },
  }).sort({ lastMessageAt: -1, updatedAt: -1 });
  const threadMap = new Map(threads.map((thread) => [String(thread.candidateId), thread]));

  for (const application of applications) {
    const candidateId = application.candidateId?._id || application.candidateId;
    if (!candidateId) {
      continue;
    }

    const candidateKey = String(candidateId);
    const profile = profileMap.get(candidateKey);
    const currentCandidateName = application.candidateId?.name || "Candidate";
    const currentCandidateEmail = application.candidateId?.email || "";
    const currentCandidateTitle = profile?.currentTitle || "";
    const currentJobTitle = application.jobId?.title || "Open role";

    const existingThread = threadMap.get(candidateKey);
    if (existingThread) {
      existingThread.candidateName = currentCandidateName;
      existingThread.candidateEmail = currentCandidateEmail;
      existingThread.candidateTitle = currentCandidateTitle;
      existingThread.jobTitle = currentJobTitle;
      existingThread.applicationId = application._id;
      existingThread.jobId = application.jobId?._id || application.jobId || null;
      await existingThread.save();
      continue;
    }

    const thread = await ChatThread.create({
      companyId: company._id,
      candidateId,
      candidateName: currentCandidateName,
      candidateEmail: currentCandidateEmail,
      candidateTitle: currentCandidateTitle,
      applicationId: application._id,
      jobId: application.jobId?._id || application.jobId || null,
      jobTitle: currentJobTitle,
      lastMessageText: "",
      lastMessageAt: application.updatedAt || application.createdAt || new Date(),
      lastSenderRole: "SYSTEM",
    });

    threadMap.set(candidateKey, thread);
  }

  return Array.from(threadMap.values())
    .sort((left, right) => {
      const leftAt = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightAt = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      return rightAt - leftAt;
    })
    .map((thread) => formatThread(thread, { companyId: company._id }));
};

const ensureCandidateThreads = async (candidateUser) => {
  const applications = await Application.find({ candidateId: candidateUser._id })
    .sort({ updatedAt: -1 })
    .populate("companyId", "name logoUrl")
    .populate("jobId", "title");

  const companyIds = applications
    .map((application) => application.companyId?._id || application.companyId)
    .filter(Boolean)
    .map((value) => String(value));

  const threads = await ChatThread.find({
    candidateId: candidateUser._id,
    companyId: { $in: companyIds },
  }).sort({ lastMessageAt: -1, updatedAt: -1 });
  const threadMap = new Map(threads.map((thread) => [String(thread.companyId), thread]));

  for (const application of applications) {
    const companyId = application.companyId?._id || application.companyId;
    if (!companyId) {
      continue;
    }

    const companyKey = String(companyId);
    const companyName = application.companyId?.name || "Company";
    const jobTitle = application.jobId?.title || "Open role";

    const existingThread = threadMap.get(companyKey);
    if (existingThread) {
      existingThread.candidateName = candidateUser.name || "Candidate";
      existingThread.jobTitle = `${companyName} - ${jobTitle}`;
      existingThread.applicationId = application._id;
      existingThread.jobId = application.jobId?._id || application.jobId || null;
      await existingThread.save();
      continue;
    }

    const thread = await ChatThread.create({
      companyId,
      candidateId: candidateUser._id,
      candidateName: candidateUser.name || "Candidate",
      candidateEmail: candidateUser.email || "",
      candidateTitle: "Candidate",
      applicationId: application._id,
      jobId: application.jobId?._id || application.jobId || null,
      jobTitle: `${companyName} - ${jobTitle}`,
      lastMessageText: "",
      lastMessageAt: application.updatedAt || application.createdAt || new Date(),
      lastSenderRole: "SYSTEM",
    });

    threadMap.set(companyKey, thread);
  }

  return Array.from(threadMap.values())
    .sort((left, right) => {
      const leftAt = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightAt = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      return rightAt - leftAt;
    })
    .map((thread) => formatThread(thread, { candidateId: candidateUser._id }));
};

const emitThreadUpdate = (threadId, eventName, payload) => {
  const socketServer = global.chatSocketServer;
  if (!socketServer) {
    return;
  }

  socketServer.to(`thread:${threadId}`).emit(eventName, payload);
};

const recordCompanyNotification = async ({ company, candidateId, jobId, threadId, text }) => {
  if (!candidateId) {
    return;
  }

  await CandidateNotification.create({
    candidateId,
    companyId: company._id,
    jobId: jobId || null,
    title: `${company.name || "A company"} has texted you`,
    message: text || `${company.name || "A company"} sent you a new chat message.`,
    category: "CHAT",
    actionUrl: "/candidate/notifications",
    metadata: {
      source: "COMPANY_CHAT",
      threadId: threadId ? String(threadId) : "",
    },
  });
};

const persistMessage = async ({ thread, senderRole, senderId, text, attachments = [], metadata = {} }) => {
  const message = await ChatMessage.create({
    threadId: thread._id,
    companyId: thread.companyId,
    candidateId: thread.candidateId,
    senderRole,
    senderId,
    text,
    attachments,
    metadata,
  });

  thread.lastMessageText = text || (attachments.length ? "Attachment" : "");
  thread.lastMessageAt = message.createdAt || new Date();
  thread.lastSenderRole = senderRole;
  if (senderRole === "COMPANY") {
    thread.companyUnreadCount = 0;
    thread.candidateUnreadCount = Number(thread.candidateUnreadCount || 0) + 1;
  } else if (senderRole === "CANDIDATE") {
    thread.candidateUnreadCount = 0;
    thread.companyUnreadCount = Number(thread.companyUnreadCount || 0) + 1;
  }
  await thread.save();
  return message;
};

exports.getCompanyThreads = async (req, res, next) => {
  try {
    const { company } = await resolveCompanyContext(req.user._id);
    const threads = await ensureCompanyThreads(company);
    res.status(200).json({ success: true, data: { threads } });
  } catch (error) {
    next(error);
  }
};

exports.getCandidateThreads = async (req, res, next) => {
  try {
    const { user } = await resolveCandidateContext(req.user._id);
    const threads = await ensureCandidateThreads(user);
    res.status(200).json({ success: true, data: { threads } });
  } catch (error) {
    next(error);
  }
};

exports.getCompanyThreadMessages = async (req, res, next) => {
  try {
    const { company } = await resolveCompanyContext(req.user._id);
    const threadId = String(req.params.threadId || "").trim();
    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    let thread = null;
    if (mongoose.Types.ObjectId.isValid(threadId)) {
      thread = await ChatThread.findOne({
        $or: [{ _id: threadId }, { candidateId: threadId }],
        companyId: company._id,
      });
    }
    if (!thread) {
      throw createHttpError(404, "Conversation not found");
    }

    const messages = await ChatMessage.find({ threadId: thread._id }).sort({ createdAt: 1 });
    thread.companyUnreadCount = 0;
    await thread.save();

    res.status(200).json({
      success: true,
      data: {
        thread: formatThread(thread, { companyId: company._id }),
        messages: messages.map(formatMessage),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getCandidateThreadMessages = async (req, res, next) => {
  try {
    const { user } = await resolveCandidateContext(req.user._id);
    const threadId = String(req.params.threadId || "").trim();
    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    const thread = await ChatThread.findOne({ _id: threadId, candidateId: user._id });
    if (!thread) {
      throw createHttpError(404, "Conversation not found");
    }

    const messages = await ChatMessage.find({ threadId: thread._id }).sort({ createdAt: 1 });
    thread.candidateUnreadCount = 0;
    await thread.save();

    res.status(200).json({
      success: true,
      data: {
        thread: formatThread(thread, { candidateId: user._id }),
        messages: messages.map(formatMessage),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.sendCompanyMessage = async (req, res, next) => {
  try {
    const { company } = await resolveCompanyContext(req.user._id);
    const threadId = String(req.params.threadId || "").trim();
    const text = String(req.body.text || "").trim();
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    const metadata = req.body.metadata || {};

    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    if (!text && !attachments.length) {
      throw createHttpError(400, "Message text or attachment is required");
    }

    let thread = null;
    if (mongoose.Types.ObjectId.isValid(threadId)) {
      thread = await ChatThread.findOne({
        $or: [{ _id: threadId }, { candidateId: threadId }],
        companyId: company._id,
      });
    }
    if (!thread) {
      throw createHttpError(404, "Conversation not found");
    }

    const message = await persistMessage({
      thread,
      senderRole: "COMPANY",
      senderId: req.user._id,
      text,
      attachments,
      metadata,
    });

    await recordCompanyNotification({
      company,
      candidateId: thread.candidateId,
      jobId: thread.jobId,
      threadId: thread._id,
      text: text || "Company sent an attachment.",
    });

    const formattedMessage = formatMessage(message);
    emitThreadUpdate(thread._id, "chat:message", {
      threadId: String(thread._id),
      message: formattedMessage,
      thread: formatThread(thread, { companyId: company._id }),
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        thread: formatThread(thread, { companyId: company._id }),
        message: formattedMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.sendCandidateMessage = async (req, res, next) => {
  try {
    const { user } = await resolveCandidateContext(req.user._id);
    const threadId = String(req.params.threadId || "").trim();
    const text = String(req.body.text || "").trim();
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    const metadata = req.body.metadata || {};

    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    if (!text && !attachments.length) {
      throw createHttpError(400, "Message text or attachment is required");
    }

    const thread = await ChatThread.findOne({ _id: threadId, candidateId: user._id });
    if (!thread) {
      throw createHttpError(404, "Conversation not found");
    }

    const message = await persistMessage({
      thread,
      senderRole: "CANDIDATE",
      senderId: req.user._id,
      text,
      attachments,
      metadata,
    });

    const formattedMessage = formatMessage(message);
    emitThreadUpdate(thread._id, "chat:message", {
      threadId: String(thread._id),
      message: formattedMessage,
      thread: formatThread(thread, { candidateId: user._id }),
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        thread: formatThread(thread, { candidateId: user._id }),
        message: formattedMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.markCompanyThreadRead = async (req, res, next) => {
  try {
    const { company } = await resolveCompanyContext(req.user._id);
    const threadId = String(req.params.threadId || "").trim();
    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    const thread = await ChatThread.findOne({ _id: threadId, companyId: company._id });
    if (!thread) {
      throw createHttpError(404, "Conversation not found");
    }

    thread.companyUnreadCount = 0;
    await thread.save();
    res.status(200).json({ success: true, data: { thread: formatThread(thread, { companyId: company._id }) } });
  } catch (error) {
    next(error);
  }
};

exports.markCandidateThreadRead = async (req, res, next) => {
  try {
    const { user } = await resolveCandidateContext(req.user._id);
    const threadId = String(req.params.threadId || "").trim();
    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    const thread = await ChatThread.findOne({ _id: threadId, candidateId: user._id });
    if (!thread) {
      throw createHttpError(404, "Conversation not found");
    }

    thread.candidateUnreadCount = 0;
    await thread.save();
    res.status(200).json({ success: true, data: { thread: formatThread(thread, { candidateId: user._id }) } });
  } catch (error) {
    next(error);
  }
};

exports.joinConversationRoom = async (req, res, next) => {
  try {
    const threadId = String(req.body.threadId || "").trim();
    if (!threadId) {
      throw createHttpError(400, "Thread id is required");
    }

    res.status(200).json({ success: true, data: { threadId } });
  } catch (error) {
    next(error);
  }
};

exports._internal = {
  resolveCompanyContext,
  resolveCandidateContext,
  persistMessage,
  formatThread,
  formatMessage,
  recordCompanyNotification,
};
