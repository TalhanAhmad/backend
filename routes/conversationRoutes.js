import express from "express";
import { getConversationById, getConversations } from "../controllers/conversationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getConversations);
router.get("/:id", protect, getConversationById);

export default router;
