/**
 * Multiple Decart keys: use `DECART_API_KEYS` and/or `DECART_API_KEY` with values separated by
 * comma, space, semicolon, or pipe. Both variables are merged (de-duplicated).
 */
export const parseDecartApiKeys = () => {
  const splitKeys = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return [];
    return s
      .split(/[\s,;|]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  };
  return [...new Set([...splitKeys(process.env.DECART_API_KEYS), ...splitKeys(process.env.DECART_API_KEY)])];
};

const shuffleInPlace = (arr) => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Random order so load spreads across keys; failures try the rest in order. */
export const getDecartApiKeysInRandomOrder = () => {
  const keys = parseDecartApiKeys();
  return shuffleInPlace([...keys]);
};

export const maskDecartApiKey = (key) => {
  const s = String(key || "");
  if (s.length <= 10) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
};
