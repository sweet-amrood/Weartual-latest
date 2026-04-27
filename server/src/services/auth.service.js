import crypto from "crypto";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { signJwt } from "../utils/token.js";

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt
});

export const signupService = async ({ username, email, password }) => {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new AppError("Email is already in use", 409);

  const existingUsername = await User.findOne({ username });
  if (existingUsername) throw new AppError("Username is already in use", 409);

  const user = await User.create({ username, email, password });
  const token = signJwt({ userId: user._id });

  return { token, user: sanitizeUser(user) };
};

export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new AppError("Invalid email or password", 401);

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new AppError("Invalid email or password", 401);

  const token = signJwt({ userId: user._id });

  return { token, user: sanitizeUser(user) };
};

export const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email }).select("+password");
  // Return success even if no user exists to avoid account enumeration.
  if (!user) {
    return {
      message: "If this email exists, a password reset link has been sent."
    };
  }

  const rawToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
  console.log(`[auth][forgot-password] reset URL generated for ${user.email}: ${resetUrl}`);

  return {
    message: "If this email exists, a password reset link has been sent."
  };
};

export const resetPasswordService = async ({ token, newPassword }) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }
  }).select("+password");

  if (!user) throw new AppError("Reset token is invalid or expired", 400);

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  const jwtToken = signJwt({ userId: user._id });
  return { token: jwtToken, user: sanitizeUser(user) };
};

export const getCurrentUserService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
};
