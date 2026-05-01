import asyncHandler from "../utils/asyncHandler.js";
import {
  forgotPasswordService,
  getCurrentUserService,
  googleAuthService,
  loginService,
  resetPasswordService,
  signupService
} from "../services/auth.service.js";
import { sendEmail } from "../config/email.js";
import { cookieOptions } from "../utils/token.js";

export const signup = asyncHandler(async (req, res) => {
  const { token, user } = await signupService(req.body);
  res.cookie("token", token, cookieOptions);

  res.status(201).json({
    success: true,
    message: "Signup successful",
    token,
    user
  });

  const welcomeHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to Weartual</h2>
      <p>Hi ${user.username},</p>
      <p>Your account has been created successfully. We are excited to have you with us.</p>
      <p>Start exploring Weartual and enjoy your experience.</p>
    </div>
  `;

  // Fire-and-forget so signup response is never blocked by email sending.
  sendEmail(user.email, "Welcome to Weartual", welcomeHtml).catch((error) => {
    console.error("[auth][signup] Welcome email dispatch failed:", error);
  });
});

export const login = asyncHandler(async (req, res) => {
  const { token, user } = await loginService(req.body);
  res.cookie("token", token, cookieOptions);

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user
  });

  const loginTime = new Date().toISOString();
  const loginAlertHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New login detected</h2>
      <p>Hi ${user.username},</p>
      <p>You just logged into your account.</p>
      <p><strong>Time:</strong> ${loginTime}</p>
    </div>
  `;

  // Fire-and-forget so login response is never blocked by email sending.
  sendEmail(user.email, "New login detected", loginAlertHtml).catch((error) => {
    console.error("[auth][login] Login alert email dispatch failed:", error);
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { token, user } = await googleAuthService({ idToken: req.body.idToken });
  res.cookie("token", token, cookieOptions);

  res.status(200).json({
    success: true,
    message: "Google authentication successful",
    token,
    user
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("token", {
    ...cookieOptions,
    maxAge: 0
  });

  res.status(200).json({
    success: true,
    message: "Logout successful"
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await forgotPasswordService(req.body.email);
  res.status(200).json({ success: true, ...result });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, user } = await resetPasswordService({
    token: req.params.token,
    newPassword: req.body.password
  });

  res.cookie("token", token, cookieOptions);
  res.status(200).json({
    success: true,
    message: "Password reset successful",
    token,
    user
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getCurrentUserService(req.user.userId);
  res.status(200).json({ success: true, user });
});
