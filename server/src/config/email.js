import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL;
const companyEmail = process.env.COMPANY_EMAIL;

const hasRequiredConfig =
  Boolean(smtpHost) &&
  Number.isFinite(smtpPort) &&
  smtpPort > 0 &&
  Boolean(smtpUser) &&
  Boolean(smtpPass);

let transporter = null;

if (hasRequiredConfig) {
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  } catch (error) {
    transporter = null;
    console.error("[email] Failed to initialize SMTP transporter:", error);
  }
} else {
  console.warn(
    "[email] SMTP transporter is disabled. Missing or invalid SMTP_HOST, SMTP_PORT, SMTP_USER, or SMTP_PASS."
  );
}

export const sendEmail = async (to, subject, html) => {
  try {
    if (!transporter) {
      console.warn(
        `[email] Transporter not configured. Skipping email send. to="${to}", subject="${subject}".`
      );
      return null;
    }

    if (!to || !subject || !html) {
      console.warn(
        `[email] Missing email fields. Skipping send. to="${to}", subject="${subject}".`
      );
      return null;
    }

    return await transporter.sendMail({
      from: fromEmail || smtpUser,
      replyTo: companyEmail || fromEmail || smtpUser,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(
      `[email] Failed to send email. to="${to}", subject="${subject}":`,
      error
    );
    return null;
  }
};

export default transporter;
