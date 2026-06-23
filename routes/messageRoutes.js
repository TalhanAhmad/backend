import express from "express";
import { getMessages, markMessagesRead, sendMessage } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:conversationId", protect, getMessages);
router.post("/", protect, sendMessage);
router.put("/read/:conversationId", protect, markMessagesRead);

export default router;
