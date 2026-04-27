import { API_URL } from "../config/api";

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
    throw new Error(data.message || "Request failed");
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

export const forgotPassword = (payload) =>
  request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getMe = () => request("/api/auth/me", { method: "GET" });

export const logout = () =>
  request("/api/auth/logout", {
    method: "POST"
  });
