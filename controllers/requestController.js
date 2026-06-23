import ChatRequest from "../models/ChatRequest.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

const populateRequest = (query) =>
  query.populate("sender", "name email profileImage bio isOnline lastSeen").populate("receiver", "name email profileImage bio isOnline lastSeen");

export const sendRequest = async (req, res) => {
  const { receiverId } = req.body;

  if (!receiverId || receiverId === req.user._id.toString()) {
    return res.status(400).json({ message: "Valid receiver is required" });
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) return res.status(404).json({ message: "Receiver not found" });

  const existingConversation = await Conversation.findOne({ participants: { $all: [req.user._id, receiverId] } });
  if (existingConversation) {
    return res.status(409).json({ message: "Conversation already exists", conversationId: existingConversation._id });
  }

  const existing = await ChatRequest.findOne({
    $or: [
      { sender: req.user._id, receiver: receiverId },
      { sender: receiverId, receiver: req.user._id }
    ]
  });

  if (existing) {
    return res.status(409).json({ message: `Request already ${existing.status}`, request: existing });
  }

  const request = await ChatRequest.create({ sender: req.user._id, receiver: receiverId });
  const populated = await populateRequest(ChatRequest.findById(request._id));
  req.app.get("io")?.to(receiverId).emit("receiveChatRequest", populated);

  res.status(201).json(populated);
};

export const getReceivedRequests = async (req, res) => {
  const requests = await populateRequest(ChatRequest.find({ receiver: req.user._id }).sort({ createdAt: -1 }));
  res.json(requests);
};

export const getSentRequests = async (req, res) => {
  const requests = await populateRequest(ChatRequest.find({ sender: req.user._id }).sort({ createdAt: -1 }));
  res.json(requests);
};

export const acceptRequest = async (req, res) => {
  const request = await ChatRequest.findOne({ _id: req.params.id, receiver: req.user._id });
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") return res.status(400).json({ message: `Request is already ${request.status}` });

  request.status = "accepted";
  await request.save();

  let conversation = await Conversation.findOne({ participants: { $all: [request.sender, request.receiver] } });
  if (!conversation) {
    conversation = await Conversation.create({ participants: [request.sender, request.receiver] });
  }

  const populated = await populateRequest(ChatRequest.findById(request._id));
  req.app.get("io")?.to(request.sender.toString()).emit("requestAccepted", { request: populated, conversation });
  req.app.get("io")?.to(request.receiver.toString()).emit("requestAccepted", { request: populated, conversation });

  res.json({ request: populated, conversation });
};

export const rejectRequest = async (req, res) => {
  const request = await ChatRequest.findOne({ _id: req.params.id, receiver: req.user._id });
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") return res.status(400).json({ message: `Request is already ${request.status}` });

  request.status = "rejected";
  await request.save();

  const populated = await populateRequest(ChatRequest.findById(request._id));
  req.app.get("io")?.to(request.sender.toString()).emit("requestRejected", populated);

  res.json(populated);
};
