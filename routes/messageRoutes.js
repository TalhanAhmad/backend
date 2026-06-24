import express from "express";
import { getMessages, markMessagesRead, sendMessage } from "../controllers/messageController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:conversationId", protect, asyncHandler(getMessages));
router.post("/", protect, asyncHandler(sendMessage));
router.put("/read/:conversationId", protect, asyncHandler(markMessagesRead));

export default router;
