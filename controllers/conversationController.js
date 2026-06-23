import Conversation from "../models/Conversation.js";

const conversationPopulate = [
  { path: "participants", select: "name email profileImage bio isOnline lastSeen" },
  { path: "lastMessage", select: "text sender receiver isRead createdAt" }
];

export const getConversations = async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .populate(conversationPopulate)
    .sort({ lastMessageTime: -1, updatedAt: -1 });

  res.json(conversations);
};

export const getConversationById = async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user._id }).populate(conversationPopulate);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  res.json(conversation);
};
