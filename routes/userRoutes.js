import express from "express";
import { deleteProfile, getUserById, getUsers, updateProfile, updateProfileImage } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);
router.put("/profile", protect, updateProfile);
router.put("/profile-image", protect, upload.single("profileImage"), updateProfileImage);
router.delete("/profile", protect, deleteProfile);

export default router;
