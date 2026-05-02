import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { signJwt } from "../utils/token.js";

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt
});

const buildBaseUsername = (value = "user") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "user";

const buildUniqueUsername = async (seed) => {
  const base = buildBaseUsername(seed);
  let candidate = base;
  let counter = 0;

  while (await User.findOne({ username: candidate })) {
    counter += 1;
    candidate = `${base}_${counter}`.slice(0, 30);
  }

  return candidate;
};

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

export const googleAuthService = async ({ idToken }) => {
  const googleClientIds = (process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (googleClientIds.length === 0) {
    throw new AppError("Google auth is not configured on server", 503);
  }
  if (!idToken || typeof idToken !== "string") {
    throw new AppError("Invalid Google token", 401);
  }
  const trimmedToken = idToken.trim();
  if (process.env.NODE_ENV !== "production") {
    console.info("[auth][google] token received:", {
      length: trimmedToken.length,
      prefix: trimmedToken.slice(0, 16),
      configuredAudiences: googleClientIds
    });
  }
  const googleClient = new OAuth2Client();

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: trimmedToken,
      audience: googleClientIds
    });
    payload = ticket.getPayload();
    if (process.env.NODE_ENV !== "production") {
      console.info("[auth][google] payload verified:", {
        aud: payload?.aud,
        iss: payload?.iss,
        email: payload?.email,
        emailVerified: payload?.email_verified
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth][google] verifyIdToken failed:", error?.message || error);
    }
    throw new AppError(`Invalid Google token: ${error?.message || "Verification failed"}`, 401);
  }

  const email = payload?.email?.toLowerCase();
  const isEmailVerified = payload?.email_verified;
  if (!email || !isEmailVerified) {
    throw new AppError("Google account email is not verified", 400);
  }

  let user = await User.findOne({ email });
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const username = await buildUniqueUsername(payload?.name || email.split("@")[0]);
    const randomPassword = crypto.randomBytes(24).toString("hex");
    user = await User.create({
      username,
      email,
      password: randomPassword
    });
  }

  const token = signJwt({ userId: user._id });
  return { token, user: sanitizeUser(user), isNewUser };
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
