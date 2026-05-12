import AppError from "../utils/AppError.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_TOKEN_RE = /^ExponentPushToken\[[^\]]+]$/;

const toObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
  return new mongoose.Types.ObjectId(id);
};

export const assertValidExpoPushToken = (raw) => {
  const token = String(raw || "").trim();
  if (!token) throw new AppError("expoPushToken is required", 400);
  if (!EXPO_TOKEN_RE.test(token)) {
    throw new AppError("Invalid Expo push token format (expected ExponentPushToken[...])", 400);
  }
  return token;
};

const buildExpoHeaders = () => {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip, deflate"
  };
  const access = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (access) headers.Authorization = `Bearer ${access}`;
  return headers;
};

/**
 * Send messages through Expo Push API (JSON array body per Expo docs).
 */
export const sendExpoPushMessages = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { sent: 0, results: [] };
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: buildExpoHeaders(),
    body: JSON.stringify(messages)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || `Expo push HTTP ${res.status}`;
    throw new AppError(msg, 502);
  }

  if (Array.isArray(json?.errors) && json.errors.length > 0 && !json?.data) {
    const msg = json.errors[0]?.message || "Expo push rejected the request";
    throw new AppError(msg, 502);
  }

  const data = Array.isArray(json?.data) ? json.data : json?.data != null ? [json.data] : [];
  return { sent: messages.length, results: data };
};

export const sendExpoPushMessagesBatched = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { sent: 0, results: [] };
  }
  const allResults = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const part = await sendExpoPushMessages(chunk);
    allResults.push(...(part.results || []));
  }
  return { sent: messages.length, results: allResults };
};

/** Used by POST /api/auth/me/notifications test hooks or admin tools if added later. */
export const sendTestPushToUserService = async (userId) => {
  const uid = toObjectId(userId, "user id");
  const user = await User.findById(uid).select("expoPushToken notificationsEnabled").lean();
  if (!user?.notificationsEnabled || !user?.expoPushToken) {
    throw new AppError("Push is disabled or no Expo token is registered for this account", 400);
  }

  return sendExpoPushMessagesBatched([
    {
      to: user.expoPushToken,
      title: "Weartual",
      body: "Push notifications are connected. You can close this message.",
      sound: "default",
      data: { type: "test" }
    }
  ]);
};
