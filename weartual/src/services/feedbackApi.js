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

export const submitFeedback = (payload) =>
  request("/api/feedback", {
    method: "POST",
    body: JSON.stringify(payload)
  });
