import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { signJwt } from "../utils/token.js";
import { dispatchEmailSafely } from "../utils/dispatchEmail.js";
import { buildPasswordResetEmail } from "../utils/emailTemplates.js";
import cloudinary from "../config/cloudinary.js";
import { assertValidExpoPushToken } from "./notifications.service.js";

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  loginPlatform: user.loginPlatform,
  totalLookCount: typeof user.totalLookCount === "number" && !Number.isNaN(user.totalLookCount) ? user.totalLookCount : 0,
  avatarUrl: user.avatarUrl ?? null,
  avatarPreset: user.avatarPreset ?? null,
  notificationsEnabled: Boolean(user.notificationsEnabled),
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

  const user = await User.create({ username, email, password, loginPlatform: "web" });
  const token = signJwt({ userId: user._id });

  return { token, user: sanitizeUser(user) };
};

export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new AppError("Invalid email or password", 401);

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new AppError("Invalid email or password", 401);

  user.loginPlatform = "web";
  await user.save();

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
      password: randomPassword,
      loginPlatform: "google"
    });
  } else {
    user.loginPlatform = "google";
    await user.save();
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

  const appOrigin = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean)[0] || "http://localhost:5173";
  const resetUrl = `${appOrigin}/reset-password/${rawToken}`;

  if (process.env.NODE_ENV === "development") {
    console.info(`[auth][forgot-password] reset link generated for ${user.email} (see email or dev log)`);
  }

  const { subject, html } = buildPasswordResetEmail(resetUrl);

  await dispatchEmailSafely({
    to: user.email,
    subject,
    html,
    context: "auth-forgot-password"
  });

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

const uploadAvatarBufferToCloudinary = (buffer, userId, originalName) =>
  new Promise((resolve, reject) => {
    const safeName = String(originalName || "avatar.jpg").replace(/[^\w.\-]/g, "_");
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `weartual/avatars/${userId}`,
        resource_type: "image",
        public_id: `avatar_${Date.now()}`,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        filename_override: safeName
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });

/**
 * PATCH /api/auth/me — partial profile update.
 * currentPassword required when changing username or email.
 */
export const updateMeProfileService = async (userId, body) => {
  const { username, email, currentPassword, avatarPreset, avatarUrl } = body;
  const user = await User.findById(userId).select("+password");
  if (!user) throw new AppError("User not found", 404);

  const wantsUsernameChange =
    username !== undefined && String(username).trim() !== user.username;
  const wantsEmailChange =
    email !== undefined && String(email).trim().toLowerCase() !== user.email;

  if (wantsUsernameChange || wantsEmailChange) {
    if (!currentPassword || typeof currentPassword !== "string") {
      throw new AppError("currentPassword is required to change email or username", 400);
    }
    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw new AppError("Current password is incorrect", 401);
  }

  if (wantsUsernameChange) {
    const nu = String(username).trim();
    if (nu.length < 3 || nu.length > 30) {
      throw new AppError("Username must be 3–30 characters", 400);
    }
    const taken = await User.findOne({ username: nu, _id: { $ne: user._id } });
    if (taken) throw new AppError("Username is already in use", 409);
    user.username = nu;
  }

  if (wantsEmailChange) {
    const ne = String(email).trim().toLowerCase();
    const taken = await User.findOne({ email: ne, _id: { $ne: user._id } });
    if (taken) throw new AppError("Email is already in use", 409);
    user.email = ne;
  }

  if (avatarPreset !== undefined) {
    user.avatarPreset =
      avatarPreset === null || avatarPreset === ""
        ? null
        : String(avatarPreset).trim().slice(0, 64) || null;
  }

  if (avatarUrl !== undefined) {
    user.avatarUrl =
      avatarUrl === null || avatarUrl === ""
        ? null
        : String(avatarUrl).trim().slice(0, 2048) || null;
  }

  await user.save();
  const fresh = await User.findById(userId);
  const token = signJwt({ userId: user._id });
  return { user: sanitizeUser(fresh), token };
};

const AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** POST /api/auth/me/avatar — multipart field `avatar`. */
export const uploadMeAvatarService = async (userId, file) => {
  if (!file?.buffer?.length) throw new AppError("Avatar file is required", 400);
  const mt = String(file.mimetype || "").toLowerCase();
  if (!AVATAR_MIME.has(mt)) {
    throw new AppError("Avatar must be JPEG, PNG, WebP, or GIF", 400);
  }
  if (file.size > 5 * 1024 * 1024) throw new AppError("Avatar must be at most 5MB", 400);

  const result = await uploadAvatarBufferToCloudinary(file.buffer, userId, file.originalname);
  const url = result?.secure_url;
  if (!url) throw new AppError("Avatar upload failed", 500);

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  user.avatarUrl = url;
  user.avatarPreset = null;
  await user.save();

  const fresh = await User.findById(userId);
  return { user: sanitizeUser(fresh) };
};

/**
 * POST /api/auth/me/notifications — { enabled, expoPushToken? | null }
 */
export const updateMeNotificationSettingsService = async (userId, { enabled, expoPushToken }) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  user.notificationsEnabled = Boolean(enabled);

  if (enabled === false) {
    user.expoPushToken = null;
  } else if (expoPushToken !== undefined) {
    if (expoPushToken === null || expoPushToken === "") {
      user.expoPushToken = null;
    } else {
      user.expoPushToken = assertValidExpoPushToken(expoPushToken);
    }
  }

  await user.save();
  const fresh = await User.findById(userId);
  return { user: sanitizeUser(fresh) };
};
