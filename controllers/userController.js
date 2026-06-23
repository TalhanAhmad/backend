import User from "../models/User.js";
import ChatRequest from "../models/ChatRequest.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const getUsers = async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("-password").sort({ isOnline: -1, name: 1 });
  const requests = await ChatRequest.find({
    $or: [{ sender: req.user._id }, { receiver: req.user._id }]
  });
  const conversations = await Conversation.find({ participants: req.user._id });

  const enrichedUsers = users.map((user) => {
    const request = requests.find((item) => {
      const sender = item.sender.toString();
      const receiver = item.receiver.toString();
      const other = user._id.toString();
      return sender === other || receiver === other;
    });
    const conversation = conversations.find((item) =>
      item.participants.some((participant) => participant.toString() === user._id.toString())
    );

    return {
      ...user.toObject(),
      requestStatus: request?.status || null,
      requestDirection: request ? (request.sender.toString() === req.user._id.toString() ? "sent" : "received") : null,
      conversationId: conversation?._id || null
    };
  });

  res.json(enrichedUsers);
};

export const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const updateProfile = async (req, res) => {
  const { name, bio } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) return res.status(404).json({ message: "User not found" });

  user.name = name || user.name;
  user.bio = typeof bio === "string" ? bio : user.bio;
  await user.save();

  res.json({ user: await User.findById(user._id).select("-password") });
};

export const updateProfileImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Image file is required" });

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const profileImage = `${baseUrl}/uploads/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user._id, { profileImage }, { new: true }).select("-password");

  res.json({ user });
};

export const deleteProfile = async (req, res) => {
  const userId = req.user._id;
  const conversations = await Conversation.find({ participants: userId }).select("_id");
  const conversationIds = conversations.map((conversation) => conversation._id);

  await Promise.all([
    Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }, { conversationId: { $in: conversationIds } }]
    }),
    ChatRequest.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
    Conversation.deleteMany({ participants: userId }),
    User.findByIdAndDelete(userId)
  ]);

  req.app.get("io")?.emit("userDeleted", { userId });
  res.json({ success: true });
};
