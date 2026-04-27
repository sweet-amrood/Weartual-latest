import nodemailer from "nodemailer";

const COMPANY_EMAIL = process.env.COMPANY_EMAIL || "weartual@gmail.com";

const getPrimaryClientUrl = () => {
  const rawClientUrl = process.env.CLIENT_URL || "";
  const firstClientUrl = rawClientUrl
    .split(",")
    .map((url) => url.trim())
    .find(Boolean);

  return firstClientUrl || "http://localhost:5173";
};

const getFeedbackUrl = () => process.env.FEEDBACK_PAGE_URL || `${getPrimaryClientUrl()}/contact`;
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const parseBoolean = (value, defaultValue = false) => {
  if (value == null || value === "") return defaultValue;
  return String(value).trim().toLowerCase() === "true";
};

const getBaseSmtpEnv = () => {
  if (!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return null;
  }

  return {
    host: process.env.SMTP_HOST.trim(),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    port: Number(process.env.SMTP_PORT),
    secure:
      process.env.SMTP_SECURE != null && process.env.SMTP_SECURE !== ""
        ? parseBoolean(process.env.SMTP_SECURE, false)
        : Number(process.env.SMTP_PORT) === 465
  };
};

const buildTransporter = ({ host, port, secure, user, pass, useGmailService = false }) =>
  nodemailer.createTransport({
    ...(useGmailService ? { service: "gmail" } : { host, port, secure }),
    secure,
    requireTLS: !secure,
    auth: {
      user,
      pass
    },
    tls: {
      minVersion: "TLSv1.2",
      ...(host ? { servername: host } : {})
    }
  });

const smtpEnv = getBaseSmtpEnv();
const primaryTransporter = smtpEnv ? buildTransporter(smtpEnv) : null;
const gmailFallbackTransporter =
  smtpEnv && smtpEnv.host === "smtp.gmail.com"
    ? buildTransporter({
        ...smtpEnv,
        port: smtpEnv.secure ? 587 : 465,
        secure: !smtpEnv.secure,
        useGmailService: true
      })
    : null;

const isTlsHandshakeError = (error) =>
  /tlsv1 alert internal error|ssl3_read_bytes|EPROTO/i.test(String(error?.message || ""));

const sendMailWithFallback = async ({ mailOptions, tag, to }) => {
  if (!primaryTransporter) {
    console.log(`[email][${tag}][skipped] transporter not configured | to=${to}`);
    return true;
  }

  try {
    const info = await primaryTransporter.sendMail(mailOptions);
    console.log(`[email][${tag}][sent] to=${to} messageId=${info?.messageId || "n/a"} mode=primary`);
    return true;
  } catch (error) {
    console.error(`[email][${tag}][failed] to=${to} reason=${error?.message || "unknown error"} mode=primary`);

    if (!gmailFallbackTransporter || !isTlsHandshakeError(error)) {
      throw error;
    }

    try {
      const info = await gmailFallbackTransporter.sendMail(mailOptions);
      console.log(`[email][${tag}][sent] to=${to} messageId=${info?.messageId || "n/a"} mode=gmail-fallback`);
      return true;
    } catch (fallbackError) {
      console.error(
        `[email][${tag}][failed] to=${to} reason=${fallbackError?.message || "unknown error"} mode=gmail-fallback`
      );
      throw fallbackError;
    }
  }
};

const getFromAddress = () => process.env.FROM_EMAIL || process.env.SMTP_USER || COMPANY_EMAIL;

export const sendPasswordResetEmail = async (email, resetUrl) => {
  if (!primaryTransporter) {
    console.log(`Password reset for ${email}: ${resetUrl}`);
    return true;
  }

  await sendMailWithFallback({
    tag: "password-reset",
    to: email,
    mailOptions: {
    from: getFromAddress(),
    to: email,
    subject: "Reset your Weartual password",
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Password reset requested</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none;">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
    }
  });

  return true;
};

export const sendFeedbackConfirmationEmail = async ({ name, email }) => {
  const feedbackUrl = getFeedbackUrl();
  const safeName = escapeHtml(name);
  const safeFeedbackUrl = escapeHtml(feedbackUrl);
  const subject = "Feedback received - Thank you for helping Weartual improve";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px;">
      <h2 style="margin-bottom: 10px;">Thank you for your feedback, ${safeName}.</h2>
      <p>We have received your message and shared it with our team for review.</p>
      <p>Your input helps us improve Weartual and deliver a better experience for everyone.</p>
      <p>
        You can submit another update or track the feedback page here:
        <a href="${safeFeedbackUrl}" style="color: #2563eb;">${safeFeedbackUrl}</a>
      </p>
      <p style="margin-top: 24px;">Best regards,<br />Weartual Team</p>
    </div>
  `;

  try {
    await sendMailWithFallback({
      tag: "feedback-confirmation",
      to: email,
      mailOptions: {
      from: getFromAddress(),
      to: email,
      subject,
      html
      }
    });
  } catch (error) {
    console.error(`[email][feedback-confirmation][final-failed] to=${email} reason=${error?.message || "unknown error"}`);
    throw error;
  }

  return true;
};

export const sendFeedbackNotificationToCompany = async ({ name, email, feedback }) => {
  const feedbackUrl = getFeedbackUrl();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeFeedback = escapeHtml(feedback);
  const safeFeedbackUrl = escapeHtml(feedbackUrl);
  const subject = `New feedback submitted by ${safeName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 720px;">
      <h2 style="margin-bottom: 10px;">New feedback submission</h2>
      <p><strong>From:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="margin: 0; padding: 12px 14px; border-left: 4px solid #2563eb; background: #f8fafc;">
        ${safeFeedback}
      </blockquote>
      <p style="margin-top: 16px;">
        Open feedback page:
        <a href="${safeFeedbackUrl}" style="color: #2563eb;">${safeFeedbackUrl}</a>
      </p>
    </div>
  `;

  try {
    await sendMailWithFallback({
      tag: "feedback-company-alert",
      to: COMPANY_EMAIL,
      mailOptions: {
      from: getFromAddress(),
      to: COMPANY_EMAIL,
      subject,
      html
      }
    });
  } catch (error) {
    console.error(
      `[email][feedback-company-alert][final-failed] to=${COMPANY_EMAIL} reason=${error?.message || "unknown error"}`
    );
    throw error;
  }

  return true;
};
