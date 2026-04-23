import asyncHandler from "../utils/asyncHandler.js";
import {
  forgotPasswordService,
  getCurrentUserService,
  loginService,
  resetPasswordService,
  signupService
} from "../services/auth.service.js";
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
