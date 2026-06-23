import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.conversationId, participants: req.user._id });
  if (!conversation) return res.status(403).json({ message: "You do not have access to this conversation" });

  const messages = await Message.find({ conversationId: conversation._id })
    .populate("sender", "name profileImage")
    .populate("receiver", "name profileImage")
    .sort({ createdAt: 1 });

  res.json(messages);
};

export const sendMessage = async (req, res) => {
  const { conversationId, text } = req.body;
  if (!conversationId || !text?.trim()) return res.status(400).json({ message: "Conversation and text are required" });

  const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
  if (!conversation) return res.status(403).json({ message: "You do not have access to this conversation" });

  const receiver = conversation.participants.find((participant) => participant.toString() !== req.user._id.toString());
  const message = await Message.create({
    conversationId,
    sender: req.user._id,
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

  req.app.get("io")?.to(conversationId).emit("receiveMessage", { message: populatedMessage, conversation: populatedConversation });
  req.app.get("io")?.to(receiver.toString()).emit("receiveMessage", { message: populatedMessage, conversation: populatedConversation });

  res.status(201).json({ message: populatedMessage, conversation: populatedConversation });
};

export const markMessagesRead = async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.conversationId, participants: req.user._id });
  if (!conversation) return res.status(403).json({ message: "You do not have access to this conversation" });

  const unreadMessages = await Message.find(
    { conversationId: conversation._id, receiver: req.user._id, isRead: false },
    "_id sender"
  );

  if (!unreadMessages.length) return res.json({ success: true, messageIds: [] });

  const messageIds = unreadMessages.map((message) => message._id);
  const senderIds = [...new Set(unreadMessages.map((message) => message.sender.toString()))];

  await Message.updateMany(
    { _id: { $in: messageIds } },
    { isRead: true }
  );

  const payload = {
    conversationId: conversation._id,
    readerId: req.user._id,
    messageIds
  };

  const io = req.app.get("io");
  io?.to(conversation._id.toString()).emit("messageRead", payload);
  senderIds.forEach((senderId) => io?.to(senderId).emit("messageRead", payload));

  res.json({ success: true, messageIds });
};
