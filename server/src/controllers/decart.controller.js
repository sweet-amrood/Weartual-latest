import { createDecartClient } from "@decartai/sdk";
import asyncHandler from "../utils/asyncHandler.js";
import { getDecartApiKeysInRandomOrder } from "../utils/decartApiKeys.js";

const parseAllowedOrigins = () => {
  const raw = [process.env.DECART_REALTIME_ALLOWED_ORIGINS, process.env.CLIENT_URL].filter(Boolean).join(",");
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    try {
      const u = new URL(p.includes("://") ? p : `https://${p}`);
      out.push(u.origin);
    } catch {
      // ignore invalid
    }
  }
  return [...new Set(out)].slice(0, 20);
};

/**
 * Short-lived Decart client token for browser WebRTC (live virtual try-on).
 * Requires auth; uses server-side DECART_API_KEY / DECART_API_KEYS.
 */
export const createRealtimeToken = asyncHandler(async (_req, res) => {
  const keys = getDecartApiKeysInRandomOrder();
  if (!keys.length) {
    return res.status(503).json({ message: "Decart API is not configured on the server." });
  }

  const modelId = (process.env.DECART_REALTIME_MODEL || "lucy-vton-2").trim();
  const ttlRaw = Number(process.env.DECART_REALTIME_TOKEN_TTL_SEC || 300);
  const expiresIn = Math.min(3600, Math.max(60, Number.isFinite(ttlRaw) ? ttlRaw : 300));

  const client = createDecartClient({ apiKey: keys[0] });
  const origins = parseAllowedOrigins();
  const token = await client.tokens.create({
    expiresIn,
    allowedModels: [modelId],
    ...(origins.length ? { allowedOrigins: origins } : {})
  });

  res.status(200).json({ ...token, modelId });
});
