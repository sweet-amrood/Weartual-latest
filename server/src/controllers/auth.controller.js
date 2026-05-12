import asyncHandler from "../utils/asyncHandler.js";
import {
  forgotPasswordService,
  getCurrentUserService,
  googleAuthService,
  loginService,
  resetPasswordService,
  signupService
} from "../services/auth.service.js";
import { cookieOptions } from "../utils/token.js";
import { dispatchEmailSafely } from "../utils/dispatchEmail.js";
import {
  buildLoginAlertEmailGoogle,
  buildLoginAlertEmailWeb,
  buildWelcomeEmailGoogle,
  buildWelcomeEmailWeb
} from "../utils/emailTemplates.js";

export const signup = asyncHandler(async (req, res) => {
  const { token, user } = await signupService(req.body);

  const { subject, html } = buildWelcomeEmailWeb(user.username);
  await dispatchEmailSafely({
    to: user.email,
    subject,
    html,
    context: "auth-signup"
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

  const { subject, html } = buildLoginAlertEmailWeb(user.username, user.email);

  await dispatchEmailSafely({
    to: user.email,
    subject,
    html,
    context: "auth-login-email"
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
  const { token, user, isNewUser } = await googleAuthService({ idToken: incomingToken });

  if (isNewUser) {
    const welcome = buildWelcomeEmailGoogle(user.username);
    await dispatchEmailSafely({
      to: user.email,
      subject: welcome.subject,
      html: welcome.html,
      context: "auth-google-signup"
    });
  } else {
    const alert = buildLoginAlertEmailGoogle(user.username, user.email);
    await dispatchEmailSafely({
      to: user.email,
      subject: alert.subject,
      html: alert.html,
      context: "auth-google-login"
    });
  }

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
