import express from "express";
import { getConversationById, getConversations } from "../controllers/conversationController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, asyncHandler(getConversations));
router.get("/:id", protect, asyncHandler(getConversationById));

export default router;
