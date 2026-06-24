import express from "express";
import { deleteProfile, getUserById, getUsers, updateProfile, updateProfileImage } from "../controllers/userController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", protect, asyncHandler(getUsers));
router.get("/:id", protect, asyncHandler(getUserById));
router.put("/profile", protect, asyncHandler(updateProfile));
router.put("/profile-image", protect, upload.single("profileImage"), asyncHandler(updateProfileImage));
router.delete("/profile", protect, asyncHandler(deleteProfile));

export default router;
