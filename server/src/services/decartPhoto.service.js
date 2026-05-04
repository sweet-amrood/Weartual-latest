import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { accessSync, constants } from "fs";
import AppError from "../utils/AppError.js";

const DEFAULT_TIMEOUT_MS = 12 * 60 * 1000;

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
    const scriptPath = (process.env.DECART_PHOTO_SCRIPT || "").trim();
    if (!scriptPath) {
      reject(new AppError("Server is not configured for image try-on (set DECART_PHOTO_SCRIPT).", 500));
      return;
    }

    if (!(process.env.DECART_API_KEY || "").trim()) {
      reject(new AppError("DECART_API_KEY is not set (required for image try-on).", 500));
      return;
    }

    try {
      accessSync(scriptPath, constants.R_OK);
    } catch {
      reject(new AppError("DECART_PHOTO_SCRIPT points to a file that cannot be read.", 500));
      return;
    }

    const pythonBin = (process.env.DECART_PYTHON || "python").trim() || "python";
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
