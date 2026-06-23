import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const onlineUsers = new Map();

export const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me");
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (_error) {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit("userOnline", { userId, isOnline: true });

    socket.on("joinConversation", async (conversationId) => {
      const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
      if (conversation) socket.join(conversationId);
    });

    socket.on("sendMessage", async ({ conversationId, text }, callback) => {
      try {
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation || !text?.trim()) return;

        const receiver = conversation.participants.find((participant) => participant.toString() !== userId);
        const message = await Message.create({
          conversationId,
          sender: userId,
          receiver,
          text: text.trim()
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageText = message.text;
        conversation.lastMessageTime = message.createdAt;
        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate("sender", "name profileImage").populate("receiver", "name profileImage");
        const populatedConversation = await Conversation.findById(conversation._id)
          .populate("participants", "name email profileImage bio isOnline lastSeen")
          .populate("lastMessage", "text sender receiver isRead createdAt");

        io.to(conversationId).emit("receiveMessage", { message: populatedMessage, conversation: populatedConversation });
        io.to(receiver.toString()).emit("receiveMessage", { message: populatedMessage, conversation: populatedConversation });
        callback?.({ ok: true, message: populatedMessage });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("typing", ({ conversationId }) => {
      socket.to(conversationId).emit("typing", { conversationId, userId });
    });

    socket.on("stopTyping", ({ conversationId }) => {
      socket.to(conversationId).emit("stopTyping", { conversationId, userId });
    });

    socket.on("sendChatRequest", ({ receiverId, request }) => {
      io.to(receiverId).emit("receiveChatRequest", request);
    });

    socket.on("messageRead", ({ conversationId }) => {
      socket.to(conversationId).emit("messageRead", { conversationId, readerId: userId });
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      io.emit("userOnline", { userId, isOnline: false, lastSeen });
    });
  });
};
