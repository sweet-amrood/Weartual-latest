import { createDecartClient } from "@decartai/sdk";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getDecartApiKeysForTryOn } from "../../preprocessing/vendor_cache/registry.js";
import { isCreditLikeVendorFailure, markApiKeyCooldown } from "../utils/decartKeyCooldown.js";
import { tryOnInfo, tryOnWarn } from "../utils/tryOnLog.js";

/** React Native WebView live try-on uses these origins (must match mobile WebView baseUrl). */
const MOBILE_LIVE_TRYON_ORIGINS = [
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost",
  "https://localhost"
];

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
  return [...new Set([...out, ...MOBILE_LIVE_TRYON_ORIGINS])].slice(0, 20);
};

/**
 * Short-lived client token for browser WebRTC (live virtual try-on).
 * Requires auth. Tries each configured key (random order, cooldown-aware) until `tokens.create` succeeds.
 */
export const createRealtimeToken = asyncHandler(async (_req, res) => {
  const keys = getDecartApiKeysForTryOn();
  if (!keys.length) {
    return res.status(503).json({ message: "Live try-on is not available right now. Please try again later." });
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

  for (let i = 0; i < keys.length; i += 1) {
    const apiKey = keys[i];
    try {
      const client = createDecartClient({ apiKey });
      const token = await client.tokens.create(tokenOptions);
      tryOnInfo(`Live try-on — attempt ${i + 1} ok`);
      return res.status(200).json({ ...token, modelId });
    } catch (err) {
      if (i < keys.length - 1) {
        tryOnWarn(`Live try-on — attempt ${i + 1} failed, trying again`);
      } else {
        tryOnWarn("Live try-on — all attempts failed");
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (isCreditLikeVendorFailure(msg)) markApiKeyCooldown(apiKey);
    }
  }

  throw new AppError("We couldn’t start a live session. Please try again later.", 503);
});
