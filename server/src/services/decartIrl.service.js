import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { accessSync, constants } from "fs";
import { fileURLToPath } from "url";
import AppError from "../utils/AppError.js";
import { mergeDecartVendorPythonPath } from "../utils/decartPythonVendorEnv.js";

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

/**
 * Runs the Decart IRL Python pipeline (irl.py): person video + garment reference image -> output MP4.
 * Requires DECART_IRL_SCRIPT (path to irl.py), DECART_API_KEY, and Python with decart deps on PATH.
 */
export const runDecartIrlPipeline = ({ videoPath, referenceImagePath, outputPath, timeoutMs = DEFAULT_TIMEOUT_MS }) =>
  new Promise((resolve, reject) => {
    const resolved = resolveScriptPath(process.env.DECART_IRL_SCRIPT, DEFAULT_IRL_SCRIPT_PATH);

    if (!(process.env.DECART_API_KEY || "").trim()) {
      reject(new AppError("DECART_API_KEY is not set (required for person video try-on).", 500));
      return;
    }

    if (typeof resolved !== "string") {
      reject(
        new AppError(`Decart IRL script cannot be read. Tried: ${resolved.attempted.join(" | ")}`, 500)
      );
      return;
    }
    const scriptPath = resolved;

    const defaultPy = process.platform === "win32" ? "python" : "python3";
    const pythonBin = (process.env.DECART_PYTHON || defaultPy).trim() || defaultPy;
    const absVideo = path.resolve(videoPath);
    const absRef = path.resolve(referenceImagePath);
    const absOut = path.resolve(outputPath);

    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const child = spawn(pythonBin, [scriptPath, absVideo, absRef, absOut], {
      env: mergeDecartVendorPythonPath(process.env),
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
