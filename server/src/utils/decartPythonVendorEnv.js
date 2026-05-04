import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_ROOT = path.resolve(__dirname, "../..");
const PYTHON_VENDOR_DIR = path.join(SERVER_ROOT, "python_vendor");

/**
 * When `server/python_vendor` exists (from postinstall `pip install -t` on Render),
 * prepend it to PYTHONPATH so `python3 photo.py` can import `decart` without a global install.
 */
export function mergeDecartVendorPythonPath(env = process.env) {
  const next = { ...env };
  try {
    if (!fs.existsSync(PYTHON_VENDOR_DIR)) return next;
  } catch {
    return next;
  }
  const sep = path.delimiter;
  const prev = next.PYTHONPATH || "";
  next.PYTHONPATH = prev ? `${PYTHON_VENDOR_DIR}${sep}${prev}` : PYTHON_VENDOR_DIR;
  return next;
}
