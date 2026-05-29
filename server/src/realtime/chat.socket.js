// chat.socket.js
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("../models/User");
const Company = require("../models/Company");
const ChatThread = require("../models/ChatThread");
const chatController = require("../controllers/chat.controller");

const SOCKET_ROOM_PREFIX = "thread:";

const getAuthToken = (socket) => {
  const authToken = socket.handshake.auth?.token || socket.handshake.query?.token || "";
  if (authToken) {
    return String(authToken).replace(/^Bearer\s+/i, "").trim();
  }

  const headerToken = socket.handshake.headers?.authorization || "";
  return String(headerToken).replace(/^Bearer\s+/i, "").trim();
};

const resolveSocketUser = async (socket) => {
  const token = getAuthToken(socket);
  if (!token) {
    throw new Error("Authentication token is required");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");
  if (!user || !user.isActive) {
    throw new Error("Invalid socket user");
  }

  return { user, tokenType: decoded.type || "USER" };
};

const ensureThreadAccess = async ({ user, threadId }) => {
  const thread = await ChatThread.findById(threadId);
  if (!thread) {
    throw new Error("Conversation not found");
  }

  const isCompanyParticipant = String(thread.companyId) === String(user.companyId || "");
  const isCandidateParticipant = String(thread.candidateId) === String(user._id || user.id);

  if (user.role === "CLIENT" && !isCompanyParticipant) {
    throw new Error("Conversation access denied");
  }

  if (user.role === "CANDIDATE" && !isCandidateParticipant) {
    throw new Error("Conversation access denied");
  }

  return thread;
};

const upsertCallState = async (thread, patch) => {
  thread.activeCall = {
    ...(thread.activeCall || {}),
    ...patch,
  };
  await thread.save();
  return thread;
};

const initChatSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
      credentials: true,
    },
  });

  global.chatSocketServer = io;

  io.use(async (socket, next) => {
    try {
      const { user, tokenType } = await resolveSocketUser(socket);
      socket.data.user = {
        id: String(user._id),
        role: user.role,
        companyId: user.companyId ? String(user.companyId) : "",
        name: user.name || "",
        email: user.email || "",
        tokenType,
      };
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    const currentUser = socket.data.user;

    socket.on("thread:join", async ({ threadId }, ack = () => {}) => {
      try {
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        socket.join(`${SOCKET_ROOM_PREFIX}${String(thread._id)}`);
        ack({ ok: true, threadId: String(thread._id) });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to join thread" });
      }
    });

    socket.on("chat:message", async (payload = {}, ack = () => {}) => {
      try {
        const threadId = String(payload.threadId || "").trim();
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        const senderRole = currentUser.role === "CLIENT" ? "COMPANY" : "CANDIDATE";
        const message = await chatController._internal.persistMessage({
          thread,
          senderRole,
          senderId: currentUser.id,
          text: String(payload.text || "").trim(),
          attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
          metadata: payload.metadata || {},
        });

        if (senderRole === "COMPANY") {
          const company = await Company.findById(thread.companyId).select("name");
          if (company) {
            await chatController._internal.recordCompanyNotification({
              company,
              candidateId: thread.candidateId,
              jobId: thread.jobId,
              threadId: thread._id,
              text: message.text || "Company sent an attachment.",
            });
          }
        }

        const formattedMessage = chatController._internal.formatMessage(message);
        const formattedThread = chatController._internal.formatThread(thread, {
          companyId: thread.companyId,
          candidateId: thread.candidateId,
        });

        io.to(`${SOCKET_ROOM_PREFIX}${String(thread._id)}`).emit("chat:message", {
          threadId: String(thread._id),
          message: formattedMessage,
          thread: formattedThread,
        });

        ack({ ok: true, threadId: String(thread._id), message: formattedMessage, thread: formattedThread });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to send message" });
      }
    });

    socket.on("call:join", async ({ threadId, mediaType = "AUDIO" }, ack = () => {}) => {
      try {
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        socket.join(`${SOCKET_ROOM_PREFIX}${String(thread._id)}`);
        const nextThread = await upsertCallState(thread, {
          state: "RINGING",
          mediaType: String(mediaType).toUpperCase() === "VIDEO" ? "VIDEO" : "AUDIO",
          initiatedBy: currentUser.role === "CLIENT" ? "COMPANY" : "CANDIDATE",
          startedAt: new Date(),
        });
        const payload = {
          threadId: String(nextThread._id),
          activeCall: nextThread.activeCall,
        };
        io.to(`${SOCKET_ROOM_PREFIX}${String(nextThread._id)}`).emit("call:state", payload);
        ack({ ok: true, ...payload });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to join call" });
      }
    });

    socket.on("call:offer", async ({ threadId, offer }, ack = () => {}) => {
      try {
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        io.to(`${SOCKET_ROOM_PREFIX}${String(thread._id)}`).emit("call:offer", {
          threadId: String(thread._id),
          offer,
          from: currentUser.id,
        });
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to relay offer" });
      }
    });

    socket.on("call:answer", async ({ threadId, answer }, ack = () => {}) => {
      try {
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        const nextThread = await upsertCallState(thread, { state: "IN_CALL" });
        io.to(`${SOCKET_ROOM_PREFIX}${String(nextThread._id)}`).emit("call:answer", {
          threadId: String(nextThread._id),
          answer,
          from: currentUser.id,
        });
        io.to(`${SOCKET_ROOM_PREFIX}${String(nextThread._id)}`).emit("call:state", {
          threadId: String(nextThread._id),
          activeCall: nextThread.activeCall,
        });
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to relay answer" });
      }
    });

    socket.on("call:ice-candidate", async ({ threadId, candidate }, ack = () => {}) => {
      try {
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        io.to(`${SOCKET_ROOM_PREFIX}${String(thread._id)}`).emit("call:ice-candidate", {
          threadId: String(thread._id),
          candidate,
          from: currentUser.id,
        });
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to relay candidate" });
      }
    });

    socket.on("call:end", async ({ threadId }, ack = () => {}) => {
      try {
        const thread = await ensureThreadAccess({ user: currentUser, threadId });
        const nextThread = await upsertCallState(thread, {
          state: "IDLE",
          mediaType: thread.activeCall?.mediaType || "AUDIO",
          initiatedBy: "SYSTEM",
          startedAt: null,
        });
        io.to(`${SOCKET_ROOM_PREFIX}${String(nextThread._id)}`).emit("call:end", {
          threadId: String(nextThread._id),
        });
        io.to(`${SOCKET_ROOM_PREFIX}${String(nextThread._id)}`).emit("call:state", {
          threadId: String(nextThread._id),
          activeCall: nextThread.activeCall,
        });
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, message: error.message || "Unable to end call" });
      }
    });
  });

  return io;
};

module.exports = {
  initChatSocket,
};
