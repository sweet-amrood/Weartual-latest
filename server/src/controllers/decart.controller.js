import { createDecartClient } from "@decartai/sdk";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getDecartApiKeysInRandomOrder, maskDecartApiKey } from "../utils/decartApiKeys.js";

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
 * Requires auth. Tries each configured API key (random order) until `tokens.create` succeeds.
 */
export const createRealtimeToken = asyncHandler(async (_req, res) => {
  const keys = getDecartApiKeysInRandomOrder();
  if (!keys.length) {
    return res.status(503).json({ message: "Decart API is not configured on the server." });
  }

  const modelId = (process.env.DECART_REALTIME_MODEL || "lucy-vton-2").trim();
  const ttlRaw = Number(process.env.DECART_REALTIME_TOKEN_TTL_SEC || 300);
  const expiresIn = Math.min(3600, Math.max(60, Number.isFinite(ttlRaw) ? ttlRaw : 300));
  const origins = parseAllowedOrigins();
  const tokenOptions = {
    expiresIn,
    allowedModels: [modelId],
    ...(origins.length ? { allowedOrigins: origins } : {})
  };

  let lastError = null;
  for (let i = 0; i < keys.length; i += 1) {
    const apiKey = keys[i];
    try {
      const client = createDecartClient({ apiKey });
      const token = await client.tokens.create(tokenOptions);
      console.info(`[decart-realtime-token] ok attempt ${i + 1}/${keys.length} key=${maskDecartApiKey(apiKey)}`);
      return res.status(200).json({ ...token, modelId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[decart-realtime-token] fail attempt ${i + 1}/${keys.length} key=${maskDecartApiKey(apiKey)}: ${msg.slice(0, 400)}`);
      lastError = err instanceof Error ? err : new Error(msg);
    }
  }

  throw new AppError(
    `All ${keys.length} Decart API key(s) failed to create a realtime token. Last: ${lastError?.message || "unknown"}`,
    503
  );
});
