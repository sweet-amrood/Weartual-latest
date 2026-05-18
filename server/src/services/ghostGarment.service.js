import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { accessSync, constants } from "fs";
import { fileURLToPath } from "url";
import AppError from "../utils/AppError.js";

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_GHOST_SCRIPT_PATH = path.resolve(__dirname, "../../preprocessing/ghost/ghost.py");
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
 * Runs ghost.py (Photoroom ghost mannequin) on a garment image before try-on.
 * CLI: python ghost.py <input_image_path> <output_image_path>
 */
export const runGhostGarmentPipeline = async ({
  garmentImagePath,
  outputPath,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const apiKey = (process.env.PHOTOROOM_API_KEY || "").trim();
  if (!apiKey) {
    throw new AppError("Garment preprocessing is not configured (missing PHOTOROOM_API_KEY).", 500);
  }

  const resolved = resolveScriptPath(process.env.GHOST_SCRIPT, DEFAULT_GHOST_SCRIPT_PATH);
  if (typeof resolved !== "string") {
    throw new AppError("Garment preprocessing script is unavailable.", 500);
  }
  const scriptPath = resolved;

  const defaultPy = process.platform === "win32" ? "python" : "python3";
  const pythonBin = (process.env.DECART_PYTHON || defaultPy).trim() || defaultPy;
  const absIn = path.resolve(garmentImagePath);
  const absOut = path.resolve(outputPath);

  await fs.mkdir(path.dirname(absOut), { recursive: true });
  await fs.unlink(absOut).catch(() => {});

  console.info(`[ghost-garment] ${absIn} -> ${absOut}`);

  return new Promise((resolve, reject) => {
    const env = { ...process.env, PHOTOROOM_API_KEY: apiKey };
    const child = spawn(pythonBin, [scriptPath, absIn, absOut], {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    let stdout = "";
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new AppError("Garment preprocessing timed out. Please try again.", 504)));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", () => {
      clearTimeout(timer);
      finish(() => reject(new AppError("Garment preprocessing could not be started.", 500)));
    });

    child.on("close", (code) => {
      void (async () => {
        try {
          clearTimeout(timer);
          if (settled) return;
          if (code !== 0) {
            const tail = (stderr || stdout).trim().slice(-2000);
            console.warn(`[ghost-garment] failed: ${tail}`);
            finish(() =>
              reject(new AppError("We couldn’t prepare the garment image. Please try another photo.", 502))
            );
            return;
          }
          try {
            await fs.access(absOut);
          } catch {
            finish(() => reject(new AppError("Garment preprocessing finished without an output file.", 502)));
            return;
          }
          const logTail = (stderr || stdout).trim();
          if (logTail) {
            console.info(`[ghost-garment] ${logTail.split("\n").slice(-4).join("\n")}`);
          }
          finish(() => resolve({ outputPath: absOut }));
        } catch (err) {
          clearTimeout(timer);
          const msg = err instanceof AppError ? err : new AppError(String(err?.message || err), 500);
          finish(() => reject(msg));
        }
      })();
    });
  });
};
