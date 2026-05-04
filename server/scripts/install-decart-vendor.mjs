/**
 * Installs server/requirements.txt into server/python_vendor (flat target).
 * Wired as npm `postinstall` so Render's `npm install` picks up Decart without a custom pip build step.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const requirements = path.join(SERVER_ROOT, "requirements.txt");
const vendor = path.join(SERVER_ROOT, "python_vendor");

if (!fs.existsSync(requirements)) {
  console.warn("[install-decart-vendor] requirements.txt not found, skip.");
  process.exit(0);
}

const isWin = process.platform === "win32";
const configured = (process.env.DECART_PYTHON || "").trim();
const fallback = isWin ? "python" : "python3";
const candidates = [...new Set([configured, fallback].filter(Boolean))];

function pipOk(py) {
  const r = spawnSync(py, ["-m", "pip", "--version"], { encoding: "utf8" });
  return r.status === 0;
}

function installWith(py) {
  return spawnSync(
    py,
    ["-m", "pip", "install", "--upgrade", "--no-cache-dir", "-r", requirements, "-t", vendor],
    { stdio: "inherit", cwd: SERVER_ROOT, env: { ...process.env } }
  );
}

let ok = false;
for (const py of candidates) {
  if (!pipOk(py)) continue;
  const inst = installWith(py);
  if (inst.status === 0) {
    ok = true;
    console.log(`[install-decart-vendor] Installed into ${vendor} using ${py}`);
    break;
  }
}

if (!ok) {
  if (process.env.RENDER === "true") {
    console.error(
      "[install-decart-vendor] Failed on Render. Ensure the service image has Python 3.10+ and pip, or set DECART_PYTHON to that interpreter."
    );
    process.exit(1);
  }
  console.warn(
    "[install-decart-vendor] Skipped (Python/pip unavailable). For Decart locally: pip install -r server/requirements.txt"
  );
  process.exit(0);
}

process.exit(0);
