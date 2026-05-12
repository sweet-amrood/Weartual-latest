import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log("cwd:", process.cwd());
console.log("SMTP_HOST:", host || "(missing)");
console.log("SMTP_PORT raw:", JSON.stringify(process.env.SMTP_PORT), "→ parsed:", port, "finite:", Number.isFinite(port));
console.log("SMTP_USER:", user || "(missing)");
console.log("SMTP_PASS set:", Boolean(pass), "length:", pass ? String(pass).length : 0);

const ok =
  Boolean(host) && Number.isFinite(port) && port > 0 && Boolean(user) && Boolean(pass);

if (!ok) {
  console.error("\nConfig check FAILED — transporter would not be created.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  connectionTimeout: 20_000,
  greetingTimeout: 20_000,
  socketTimeout: 25_000,
  auth: { user, pass },
});

try {
  await transporter.verify();
  console.log("\nSMTP verify: OK (server accepted credentials).");
} catch (e) {
  console.error("\nSMTP verify FAILED:");
  console.error(e?.message || e);
  process.exit(1);
}
