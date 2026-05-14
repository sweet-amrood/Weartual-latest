/**
 * Strip vendor / backend implementation details from messages shown to users.
 * Returns the original string when it looks safe; otherwise a generic line.
 */
export function sanitizePublicErrorMessage(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "Something went wrong. Please try again.";

  const lower = s.toLowerCase();
  const generic = "We couldn’t complete that request. Please try again in a moment.";

  const internalHints = [
    "decart",
    "lucy-vton",
    "lucy-2.1",
    "lucy-vton-2",
    "lucy-2.1-vton",
    "api key",
    "api keys",
    "api limit",
    "limit reached",
    "exhausted",
    "realtime token",
    "token.create",
    "client token",
    "photo.py",
    "irl.py",
    "preprocessing",
    "python exited",
    "pipeline timed",
    "websocket",
    "webrtc_server",
    "insufficient credit",
    "not enough credit",
    "credit limit",
    "decart_api",
    "vite_decart",
    "cloudinary",
    "openai"
  ];
  if (internalHints.some((h) => lower.includes(h))) return generic;

  if (/\ball\s+\d+\s+/.test(lower) && lower.includes("fail")) return generic;

  return s;
}
