import express from "express";
import { acceptRequest, getReceivedRequests, getSentRequests, rejectRequest, sendRequest } from "../controllers/requestController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send", protect, asyncHandler(sendRequest));
router.get("/received", protect, asyncHandler(getReceivedRequests));
router.get("/sent", protect, asyncHandler(getSentRequests));
router.put("/:id/accept", protect, asyncHandler(acceptRequest));
router.put("/:id/reject", protect, asyncHandler(rejectRequest));

export default router;
