import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  bio: user.bio,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt
});

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const user = await User.create({ name, email, password });
  res.status(201).json({ user: sanitizeUser(user), token: generateToken(user._id) });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({ user: sanitizeUser(user), token: generateToken(user._id) });
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};
