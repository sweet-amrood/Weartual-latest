import { API_URL } from "../config/api";
import { sanitizePublicErrorMessage } from "../lib/publicErrorMessage";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include",
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(sanitizePublicErrorMessage(data.message || "Request failed"));
  }

  return data;
};

export const signup = (payload) =>
  request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const login = (payload) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const googleAuth = (payload) =>
  request("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(payload)
  });

/** Link Google to the logged-in account (web / email-password accounts only; Google email must match profile). */
export const linkGoogleAccount = (payload) =>
  request("/api/auth/me/link-google", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const forgotPassword = (payload) =>
  request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const resetPassword = ({ token, password }) =>
  request(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify({ password })
  });

export const getMe = () => request("/api/auth/me", { method: "GET" });

export const patchMe = (payload) =>
  request("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const uploadMyAvatar = async (file) => {
  const form = new FormData();
  form.append("avatar", file);
  const response = await fetch(`${API_URL}/api/auth/me/avatar`, {
    method: "POST",
    credentials: "include",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Upload failed");
  return data;
};

export const updateNotificationSettings = (payload) =>
  request("/api/auth/me/notifications", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const logout = () =>
  request("/api/auth/logout", {
    method: "POST"
  });
