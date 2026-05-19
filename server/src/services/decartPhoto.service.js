import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { accessSync, constants } from "fs";
import { fileURLToPath } from "url";
import AppError from "../utils/AppError.js";
import { mergeDecartVendorPythonPath } from "../utils/decartPythonVendorEnv.js";
import { getDecartApiKeysForTryOn } from "../../preprocessing/vendor_cache/registry.js";
import { isCreditLikeVendorFailure, markApiKeyCooldown } from "../utils/decartKeyCooldown.js";
import { tryOnInfo, tryOnWarn } from "../utils/tryOnLog.js";

const DEFAULT_TIMEOUT_MS = 12 * 60 * 1000;
const TRYON_NO_CHANGE_MESSAGE =
  "The try-on did not change your outfit. Use a clear front-facing person photo and a flat garment image, or turn off fast mode in settings.";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PHOTO_SCRIPT_PATH = path.resolve(__dirname, "../../preprocessing/photo.py");
const SERVER_ROOT = path.resolve(__dirname, "../..");

const resolveScriptPath = (configuredPath, fallbackPath) => {
  const raw = (configuredPath || "").trim();
  const candidates = [];
  if (raw) {
    if (path.isAbsolute(raw)) {
      candidates.push(raw);
    } else {
      candidates.push(path.resolve(process.cwd(), raw));
      candidates.push(path.resolve(SERVER_ROOT, raw));
    }
  }
  candidates.push(fallbackPath);

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.R_OK);
      return candidate;
    } catch {
      // Try next candidate
    }
  }
  return { attempted: candidates };
};

const runDecartPhotoOnceWithKey = ({
  scriptPath,
  pythonBin,
  personImagePath,
  garmentImagePath,
  outputPath,
  timeoutMs,
  apiKey
}) =>
  new Promise((resolve, reject) => {
    const absPerson = path.resolve(personImagePath);
    const absGarment = path.resolve(garmentImagePath);
    const absOut = path.resolve(outputPath);

    const env = mergeDecartVendorPythonPath({
      ...process.env,
      DECART_API_KEY: apiKey
    });

    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const child = spawn(pythonBin, [scriptPath, absPerson, absGarment, absOut], {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    let stdout = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new AppError("Your try-on is taking too long. Please try again with smaller images.", 504)));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      finish(() => reject(new AppError("The try-on step could not be started. Please try again.", 500)));
    });

    child.on("close", async (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code !== 0) {
        const tail = (stderr || stdout).trim().slice(-4000);
        const noChange = code === 3 || /TryOnNoChange/i.test(tail);
        if (noChange) {
          finish(() => reject(new AppError(TRYON_NO_CHANGE_MESSAGE, 422)));
          return;
        }
        if (isCreditLikeVendorFailure(tail)) markApiKeyCooldown(apiKey);
        finish(() =>
          reject(new AppError("We couldn’t generate your try-on. Please try different photos or try again later.", 502))
        );
        return;
      }
      try {
        await fs.access(absOut);
      } catch {
        finish(() => reject(new AppError("Your try-on finished but the result was unavailable. Please try again.", 502)));
        return;
      }
      finish(() => resolve({ outputPath: absOut }));
    });
  });

/**
 * Runs Decart photo.py: person image + garment reference -> output image file (PNG).
 * Tries multiple vendor tokens (preprocessing/vendor_cache/llvmpass.registry) in random order until one succeeds.
 */
export const runDecartPhotoPipeline = async ({
  personImagePath,
  garmentImagePath,
  outputPath,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const keys = getDecartApiKeysForTryOn();
  if (!keys.length) {
    throw new AppError("Try-on is not available right now. Please try again later.", 500);
  }

  const resolved = resolveScriptPath(process.env.DECART_PHOTO_SCRIPT, DEFAULT_PHOTO_SCRIPT_PATH);
  if (typeof resolved !== "string") {
    throw new AppError("Try-on is temporarily unavailable. Please try again later.", 500);
  }
  const scriptPath = resolved;

  const defaultPy = process.platform === "win32" ? "python" : "python3";
  const pythonBin = (process.env.DECART_PYTHON || defaultPy).trim() || defaultPy;
  const absOut = path.resolve(outputPath);

  let lastError = null;
  for (let i = 0; i < keys.length; i += 1) {
    const apiKey = keys[i];
    try {
      await fs.unlink(absOut).catch(() => {});
      tryOnInfo(`Try-on generation — attempt ${i + 1}/${keys.length}`);
      const result = await runDecartPhotoOnceWithKey({
        scriptPath,
        pythonBin,
        personImagePath,
        garmentImagePath,
        outputPath,
        timeoutMs,
        apiKey
      });
      tryOnInfo("Try-on generation complete");
      return result;
    } catch (err) {
      const msg = err instanceof AppError ? err.message : String(err?.message || err);
      const isNoChange = err instanceof AppError && err.statusCode === 422;
      if (isNoChange) {
        tryOnWarn(`Try-on generation — attempt ${i + 1} returned unchanged person, trying again`);
      } else if (i < keys.length - 1) {
        tryOnWarn(`Try-on generation — attempt ${i + 1} failed, trying again`);
      } else {
        tryOnWarn("Try-on generation — all attempts failed");
      }
      lastError = err instanceof AppError ? err : new AppError(msg, 502);
    }
  }

  const code =
    lastError instanceof AppError && typeof lastError.statusCode === "number" && lastError.statusCode >= 400
      ? lastError.statusCode
      : 502;
  if (lastError instanceof AppError && lastError.statusCode === 422) {
    throw lastError;
  }
  throw new AppError("We couldn’t generate your try-on. Please try again in a few minutes.", code);
};
