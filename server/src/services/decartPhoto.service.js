import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { accessSync, constants } from "fs";
import { fileURLToPath } from "url";
import AppError from "../utils/AppError.js";

const DEFAULT_TIMEOUT_MS = 12 * 60 * 1000;
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

/**
 * Runs Decart photo.py: person image + garment reference -> output image file (PNG).
 * Requires DECART_PHOTO_SCRIPT and DECART_API_KEY.
 */
export const runDecartPhotoPipeline = ({
  personImagePath,
  garmentImagePath,
  outputPath,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) =>
  new Promise((resolve, reject) => {
    const resolved = resolveScriptPath(process.env.DECART_PHOTO_SCRIPT, DEFAULT_PHOTO_SCRIPT_PATH);

    if (!(process.env.DECART_API_KEY || "").trim()) {
      reject(new AppError("DECART_API_KEY is not set (required for image try-on).", 500));
      return;
    }

    if (typeof resolved !== "string") {
      reject(
        new AppError(`Decart photo script cannot be read. Tried: ${resolved.attempted.join(" | ")}`, 500)
      );
      return;
    }
    const scriptPath = resolved;

    const defaultPy = process.platform === "win32" ? "python" : "python3";
    const pythonBin = (process.env.DECART_PYTHON || defaultPy).trim() || defaultPy;
    const absPerson = path.resolve(personImagePath);
    const absGarment = path.resolve(garmentImagePath);
    const absOut = path.resolve(outputPath);

    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const child = spawn(pythonBin, [scriptPath, absPerson, absGarment, absOut], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    let stdout = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new AppError("Decart image pipeline timed out.", 504)));
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
          reject(new AppError(tail ? `Decart image failed: ${tail}` : `Decart image exited with code ${code}`, 502))
        );
        return;
      }
      try {
        await fs.access(absOut);
      } catch {
        finish(() => reject(new AppError("Decart image finished but output file is missing.", 502)));
        return;
      }
      finish(() => resolve({ outputPath: absOut }));
    });
  });
