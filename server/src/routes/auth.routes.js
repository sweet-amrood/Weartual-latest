import { Router } from "express";
import multer from "multer";
import {
  forgotPassword,
  getCurrentUser,
  googleAuth,
  login,
  logout,
  patchMe,
  resetPassword,
  signup,
  updateMeNotifications,
  uploadMeAvatar
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  forgotPasswordValidation,
  googleAuthValidation,
  loginValidation,
  patchMeValidation,
  postMeNotificationsValidation,
  resetPasswordValidation,
  signupValidation,
  validate
} from "../validators/auth.validators.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.post("/google", googleAuthValidation, validate, googleAuth);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidation, validate, resetPassword);

router.patch("/me", requireAuth, patchMeValidation, validate, patchMe);
router.post("/me/avatar", requireAuth, upload.single("avatar"), uploadMeAvatar);
router.post("/me/notifications", requireAuth, postMeNotificationsValidation, validate, updateMeNotifications);
router.get("/me", requireAuth, getCurrentUser);

export default router;
