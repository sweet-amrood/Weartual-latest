const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error("Missing VITE_API_URL. Set it in your frontend environment.");
}

export const API_URL = rawApiUrl.replace(/\/+$/, "");
