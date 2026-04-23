const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const listMyImages = () => requestJson("/api/images/me", { method: "GET" });

export const uploadMyImage = async (file) => {
  const form = new FormData();
  form.append("image", file);
  return requestJson("/api/images/me", { method: "POST", body: form });
};

