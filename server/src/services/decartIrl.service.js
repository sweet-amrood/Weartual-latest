import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { accessSync, constants } from "fs";
import { fileURLToPath } from "url";
import AppError from "../utils/AppError.js";
import { mergeDecartVendorPythonPath } from "../utils/decartPythonVendorEnv.js";
import { getDecartApiKeysInRandomOrder, maskDecartApiKey } from "../utils/decartApiKeys.js";

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_IRL_SCRIPT_PATH = path.resolve(__dirname, "../../preprocessing/irl.py");
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

const runDecartIrlOnceWithKey = ({
  scriptPath,
  pythonBin,
  videoPath,
  referenceImagePath,
  outputPath,
  timeoutMs,
  apiKey
}) =>
  new Promise((resolve, reject) => {
    const absVideo = path.resolve(videoPath);
    const absRef = path.resolve(referenceImagePath);
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

    const child = spawn(pythonBin, [scriptPath, absVideo, absRef, absOut], {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    let stdout = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new AppError("Decart IRL pipeline timed out.", 504)));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      finish(() => reject(new AppError(`Failed to start Python: ${err.message}`, 500)));
    });

    child.on("close", async (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code !== 0) {
        const tail = (stderr || stdout).trim().slice(-2000);
        finish(() =>
          reject(new AppError(tail ? `Decart IRL failed: ${tail}` : `Decart IRL exited with code ${code}`, 502))
        );
        return;
      }
      try {
        await fs.access(absOut);
      } catch {
        finish(() => reject(new AppError("Decart IRL finished but output file is missing.", 502)));
        return;
      }
      finish(() => resolve({ outputPath: absOut }));
    });
  });

/**
 * Runs Decart irl.py: person video + garment reference image -> output MP4.
 * Tries multiple API keys in random order until one succeeds.
 */
export const runDecartIrlPipeline = async ({
  videoPath,
  referenceImagePath,
  outputPath,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const keys = getDecartApiKeysInRandomOrder();
  if (!keys.length) {
    throw new AppError(
      "No Decart API keys configured. Set DECART_API_KEY and/or DECART_API_KEYS (comma-separated).",
      500
    );
  }

  const resolved = resolveScriptPath(process.env.DECART_IRL_SCRIPT, DEFAULT_IRL_SCRIPT_PATH);
  if (typeof resolved !== "string") {
    throw new AppError(`Decart IRL script cannot be read. Tried: ${resolved.attempted.join(" | ")}`, 500);
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
      console.info(`[decart-irl] attempt ${i + 1}/${keys.length} key=${maskDecartApiKey(apiKey)}`);
      const result = await runDecartIrlOnceWithKey({
        scriptPath,
        pythonBin,
        videoPath,
        referenceImagePath,
        outputPath,
        timeoutMs,
        apiKey
      });
      return result;
    } catch (err) {
      const msg = err instanceof AppError ? err.message : String(err?.message || err);
      console.warn(`[decart-irl] key ${maskDecartApiKey(apiKey)} failed: ${msg.slice(0, 400)}`);
      lastError = err instanceof AppError ? err : new AppError(msg, 502);
    }
  }

  const code =
    lastError instanceof AppError && typeof lastError.statusCode === "number" && lastError.statusCode >= 400
      ? lastError.statusCode
      : 502;
  throw new AppError(
    `All ${keys.length} Decart API key(s) failed for video try-on. Last error: ${lastError?.message || "unknown"}`,
    code
  );
};
