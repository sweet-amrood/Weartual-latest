import { spawn } from "child_process";
import { createRequire } from "module";
import fs from "fs/promises";

const require = createRequire(import.meta.url);

/**
 * @returns {{ path: string, source: string }}
 */
const getFfmpegExecutable = () => {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return { path: fromEnv, source: "FFMPEG_PATH" };
  try {
    const p = require("ffmpeg-static");
    if (p && typeof p === "string") return { path: p, source: "ffmpeg-static" };
  } catch {
    // not installed
  }
  return { path: "ffmpeg", source: "PATH" };
};

/**
 * Re-encode MP4 to H.264 + yuv420p + faststart so browsers can play it in <video>.
 * OpenCV "mp4v" output is often not decodable in browsers.
 * Uses the `ffmpeg-static` package (real binary) when FFMPEG_PATH is not set.
 * @returns {Promise<boolean>} true if file was replaced in-place
 */
export const transcodeToH264FastStartInPlace = async (mp4Path) => {
  const { path: ffmpegBin, source } = getFfmpegExecutable();
  const tmpPath = `${mp4Path}.h264tmp.mp4`;

  const ok = await new Promise((resolve) => {
    const stderrChunks = [];
    const child = spawn(
      ffmpegBin,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        mp4Path,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        tmpPath
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    child.stderr?.on("data", (d) => stderrChunks.push(d));
    child.on("close", (code) => {
      if (code !== 0) {
        const errText = Buffer.concat(stderrChunks).toString("utf8").trim();
        if (errText) {
          console.error(`[transcode] ffmpeg failed (${source}):`, errText.slice(0, 1500));
        } else {
          console.error(`[transcode] ffmpeg exited ${code} (${source}) — is the binary valid?`);
        }
      }
      resolve(code === 0);
    });
    child.on("error", (err) => {
      console.error(`[transcode] could not run ffmpeg from ${source} (${ffmpegBin}):`, err.message);
      resolve(false);
    });
  });

  if (!ok) return false;

  console.info(`[transcode] H.264 encode succeeded (ffmpeg: ${source})`);

  try {
    await fs.unlink(mp4Path);
  } catch {
    // ignore
  }
  try {
    await fs.rename(tmpPath, mp4Path);
    return true;
  } catch {
    try {
      await fs.unlink(tmpPath);
    } catch {
      // ignore
    }
    return false;
  }
};
