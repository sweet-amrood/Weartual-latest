/**
 * In-memory cooldown for vendor API keys that recently failed with quota / credit style errors.
 * Keys are skipped on subsequent try-on / token attempts until cooldown expires (default 1h, env DECART_KEY_COOLDOWN_MS).
 * Not persisted across process restarts.
 */

/** @type {Map<string, number>} apiKey -> epoch ms when cooldown ends */
const cooldownUntil = new Map();

const defaultCooldownMs = () => {
  const n = Number(process.env.DECART_KEY_COOLDOWN_MS);
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 1000;
};

/** Internal-only: detect credit / quota style failures from stderr or SDK messages (never sent to clients). */
export const isCreditLikeVendorFailure = (raw) => {
  const msg = String(raw ?? "").toLowerCase();
  if (!msg.trim()) return false;
  const hints = [
    "insufficient credit",
    "not enough credit",
    "credit limit",
    "out of credit",
    "quota",
    "exceeds your",
    "billing",
    "402",
    "429",
    "payment required",
    "balance",
    "rate limit",
    "usage limit",
    "limit exceeded",
    "account suspended",
    "payment",
    "funds",
    "invalid api key",
    "unauthorized",
    "401",
    "403",
    "token_create",
    "exhausted"
  ];
  return hints.some((h) => msg.includes(h));
};

export const markApiKeyCooldown = (apiKey, ms) => {
  if (!apiKey || typeof apiKey !== "string") return;
  const duration = typeof ms === "number" && ms > 0 ? ms : defaultCooldownMs();
  cooldownUntil.set(apiKey, Date.now() + duration);
};

const pruneExpired = () => {
  const now = Date.now();
  for (const [k, until] of cooldownUntil.entries()) {
    if (until <= now) cooldownUntil.delete(k);
  }
};

/**
 * Returns keys with recently-failed credit keys removed. If all would be removed, returns original list (fail-open).
 */
export const filterKeysNotInCooldown = (keys) => {
  if (!keys?.length) return keys;
  pruneExpired();
  const now = Date.now();
  const active = keys.filter((k) => {
    const until = cooldownUntil.get(k);
    return until == null || until <= now;
  });
  if (active.length === 0) {
    console.warn("[decart-key-cooldown] all keys in cooldown; using full key list for this attempt");
    return [...keys];
  }
  return active;
};
