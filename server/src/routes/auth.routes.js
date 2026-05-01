import { Router } from "express";
import {
  forgotPassword,
  getCurrentUser,
  googleAuth,
  login,
  logout,
  resetPassword,
  signup
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  forgotPasswordValidation,
  googleAuthValidation,
  loginValidation,
  resetPasswordValidation,
  signupValidation,
  validate
} from "../validators/auth.validators.js";

const router = Router();

router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.post("/google", googleAuthValidation, validate, googleAuth);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidation, validate, resetPassword);
router.get("/me", requireAuth, getCurrentUser);

export default router;
