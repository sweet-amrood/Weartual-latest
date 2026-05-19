import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { filterKeysNotInCooldown } from "../../src/utils/decartKeyCooldown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY_PATH = path.join(__dirname, "llvmpass.registry");

const resolveRegistryPath = () => {
  const raw = (process.env.TRYON_VENDOR_REGISTRY || "").trim();
  if (!raw) return DEFAULT_REGISTRY_PATH;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
};

const splitKeys = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return [];
  return s
    .split(/[\s,;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
};

let cachedKeys = null;
let cachedMtime = null;

/**
 * Try-on vendor tokens live in preprocessing/vendor_cache/llvmpass.registry
 * (comma/space/semicolon/pipe separated). Override path with TRYON_VENDOR_REGISTRY.
 */
export const parseDecartApiKeys = () => {
  const registryPath = resolveRegistryPath();
  try {
    const stat = fs.statSync(registryPath);
    if (cachedKeys && cachedMtime === stat.mtimeMs) return cachedKeys;
    const text = fs.readFileSync(registryPath, "utf8");
    const body = text
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*$/, "").trim())
      .filter(Boolean)
      .join(" ");
    cachedKeys = [...new Set(splitKeys(body))];
    cachedMtime = stat.mtimeMs;
    return cachedKeys;
  } catch {
    cachedKeys = [];
    cachedMtime = null;
    return [];
  }
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

/** Same as random order, but skips keys in temporary cooldown after credit/quota failures. */
export const getDecartApiKeysForTryOn = () => {
  const keys = shuffleInPlace([...parseDecartApiKeys()]);
  return filterKeysNotInCooldown(keys);
};

export const maskDecartApiKey = (key) => {
  const s = String(key || "");
  if (s.length <= 10) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
};
