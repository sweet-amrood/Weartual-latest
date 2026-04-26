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

export const uploadMyImage = async ({ imageFile, garmentFile }) => {
  const form = new FormData();
  form.append("image", imageFile);
  form.append("garment", garmentFile);
  return requestJson("/api/images/me", { method: "POST", body: form });
};

export const listDatasetSamples = (type, offset = 0) =>
  requestJson(`/api/images/samples?type=${encodeURIComponent(type)}&offset=${encodeURIComponent(offset)}`, { method: "GET" }).then((data) => ({
    ...data,
    samples: (data?.samples || []).map((sample) => ({
      ...sample,
      url: `${API_BASE_URL}${sample.url}`
    }))
  }));

