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

const EMAIL_TIMEOUT_MS = 5000;

const dispatchEmailSafely = async ({ to, subject, html, context }) => {
  try {
    await Promise.race([
      sendEmail(to, subject, html),
      new Promise((resolve) => setTimeout(resolve, EMAIL_TIMEOUT_MS))
    ]);
  } catch (error) {
    console.error(`[auth][${context}] Email dispatch failed:`, error);
  }
};

export const signup = asyncHandler(async (req, res) => {
  const { token, user } = await signupService(req.body);

  const welcomeHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to Weartual</h2>
      <p>Hi ${user.username},</p>
      <p>Your account has been created successfully. We are excited to have you with us.</p>
      <p>Start exploring Weartual and enjoy your experience.</p>
    </div>
  `;

  await dispatchEmailSafely({
    to: user.email,
    subject: "Welcome to Weartual",
    html: welcomeHtml,
    context: "signup"
  });

  res.cookie("token", token, cookieOptions);
  res.status(201).json({
    success: true,
    message: "Signup successful",
    token,
    user
  });
});

export const login = asyncHandler(async (req, res) => {
  const { token, user } = await loginService(req.body);

  const loginTime = new Date().toISOString();
  const loginAlertHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New login detected</h2>
      <p>Hi ${user.username},</p>
      <p>You just logged into your account.</p>
      <p><strong>Time:</strong> ${loginTime}</p>
    </div>
  `;

  await dispatchEmailSafely({
    to: user.email,
    subject: "New login detected",
    html: loginAlertHtml,
    context: "login"
  });

  res.cookie("token", token, cookieOptions);
  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const incomingToken = req.body?.token || req.body?.idToken;
  const { token, user } = await googleAuthService({ idToken: incomingToken });
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
