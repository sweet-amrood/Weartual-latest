import { API_URL } from "../config/api";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const listMyImages = () => requestJson("/api/images/me", { method: "GET" });

export const getMyLookCount = () => requestJson("/api/images/me/look-count", { method: "GET" });

export const deleteMyImage = (jobId) =>
  requestJson(`/api/images/me/${encodeURIComponent(jobId)}`, { method: "DELETE" });

export const deleteMyImageByResultUrl = (resultUrl) =>
  requestJson("/api/images/me/delete-by-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resultUrl })
  });

export const uploadMyImage = async ({ imageFile, garmentFile }) => {
  const form = new FormData();
  form.append("image", imageFile);
  form.append("garment", garmentFile);
  const response = await fetch(`${API_URL}/api/images/me`, {
    method: "POST",
    credentials: "include",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Please create an account or log in to use try-on generation.");
    }
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const listDatasetSamples = (type, offset = 0) =>
  requestJson(`/api/images/samples?type=${encodeURIComponent(type)}&offset=${encodeURIComponent(offset)}`, { method: "GET" }).then((data) => ({
    ...data,
    samples: (data?.samples || []).map((sample) => ({
      ...sample,
      url: `${API_URL}${sample.url}`
    }))
  }));

