/**
 * Branded, table-safe HTML for transactional email (Weartual).
 */

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatLoginTime = () =>
  new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });

const emailShell = ({ preheader, innerHtml, footerLines = [] }) => {
  const footer =
    footerLines.length > 0
      ? footerLines.map((line) => `<p style="margin:0 0 8px;">${line}</p>`).join("")
      : `<p style="margin:0;">Weartual · Virtual try-on</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weartual</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-radius:14px;overflow:hidden;background:#ffffff;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:26px 28px;background:linear-gradient(135deg,#0f172a 0%,#3730a3 55%,#4f46e5 100%);">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">Weartual</p>
              <p style="margin:10px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.45;color:rgba(255,255,255,0.88);">Virtual try-on · Fit confidence before you buy</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.65;color:#334155;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.55;color:#64748b;">
              ${footer}
              <p style="margin:12px 0 0;">This is an automated message. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/** Email + password registration */
export const buildWelcomeEmailWeb = (username) => {
  const u = escapeHtml(username);
  const preheader = `Welcome to Weartual, ${username}. Your account is ready.`;
  const innerHtml = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">Welcome to Weartual</p>
    <p style="margin:0 0 14px;">Hello ${u},</p>
    <p style="margin:0 0 14px;">Thank you for joining Weartual. Your account has been created successfully using your <strong>email address and password</strong>.</p>
    <p style="margin:0 0 14px;">You can now explore virtual try-on, save looks, and manage your style preferences from your dashboard.</p>
    <p style="margin:0;">If you did not create this account, please contact our support team so we can secure your email address.</p>
  `;
  return {
    subject: "Welcome to Weartual — your account is ready",
    html: emailShell({
      preheader,
      innerHtml,
      footerLines: [
        `<strong>Weartual</strong> · Questions? Reply is disabled; use the contact form on our website.`
      ]
    })
  };
};

/** Google OAuth registration */
export const buildWelcomeEmailGoogle = (username) => {
  const u = escapeHtml(username);
  const preheader = `Welcome to Weartual, ${username}. Signed up with Google.`;
  const innerHtml = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">Welcome to Weartual</p>
    <p style="margin:0 0 14px;">Hello ${u},</p>
    <p style="margin:0 0 14px;">Thank you for joining Weartual. Your account was created using your <strong>Google account</strong>. You can sign in anytime with Google—no separate Weartual password is required for that method.</p>
    <p style="margin:0 0 14px;">We are glad to have you with us and look forward to helping you preview fits with confidence.</p>
    <p style="margin:0;">If you did not authorize this signup, please secure your Google account and reach out to us through our website.</p>
  `;
  return {
    subject: "Welcome to Weartual — your account is ready",
    html: emailShell({
      preheader,
      innerHtml,
      footerLines: [`<strong>Weartual</strong> · Sign-in method: Google`]
    })
  };
};

/** Email + password sign-in */
export const buildLoginAlertEmailWeb = (username, email) => {
  const u = escapeHtml(username);
  const e = escapeHtml(email);
  const when = escapeHtml(formatLoginTime());
  const preheader = `Your Weartual account was signed in using email and password.`;
  const innerHtml = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">New sign-in to your account</p>
    <p style="margin:0 0 14px;">Hello ${u},</p>
    <p style="margin:0 0 14px;">This is a security notice to let you know that your Weartual account (<strong>${e}</strong>) was accessed using your <strong>email address and password</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <tr><td style="padding:14px 16px;font-size:14px;color:#475569;">
        <p style="margin:0 0 6px;"><strong>When:</strong> ${when}</p>
        <p style="margin:0;"><strong>Method:</strong> Email &amp; password</p>
      </td></tr>
    </table>
    <p style="margin:0 0 14px;">If this was you, you can disregard this message.</p>
    <p style="margin:0;">If you do not recognize this activity, we recommend changing your Weartual password immediately and ensuring your email inbox is secure.</p>
  `;
  return {
    subject: "Weartual — new sign-in with email & password",
    html: emailShell({
      preheader,
      innerHtml,
      footerLines: [`<strong>Weartual</strong> · Account security notification`]
    })
  };
};

/** Google sign-in */
export const buildLoginAlertEmailGoogle = (username, email) => {
  const u = escapeHtml(username);
  const e = escapeHtml(email);
  const when = escapeHtml(formatLoginTime());
  const preheader = `Your Google account was used to sign in to Weartual.`;
  const innerHtml = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">New sign-in with Google</p>
    <p style="margin:0 0 14px;">Hello ${u},</p>
    <p style="margin:0 0 14px;">Your <strong>Google account</strong> (<strong>${e}</strong>) was used to sign in to <strong>Weartual</strong>. We sent this message so you are aware of activity on your profile.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <tr><td style="padding:14px 16px;font-size:14px;color:#475569;">
        <p style="margin:0 0 6px;"><strong>When:</strong> ${when}</p>
        <p style="margin:0;"><strong>Method:</strong> Google</p>
      </td></tr>
    </table>
    <p style="margin:0 0 14px;">If you just signed in to Weartual with Google, no further action is needed.</p>
    <p style="margin:0;">If you did not sign in, we recommend reviewing your Google account security (password and two-step verification) and revoking access to unfamiliar apps under your Google Account settings.</p>
  `;
  return {
    subject: "Weartual — your Google account was used to sign in",
    html: emailShell({
      preheader,
      innerHtml,
      footerLines: [`<strong>Weartual</strong> · Google sign-in notification`]
    })
  };
};

export const buildPasswordResetEmail = (resetUrl) => {
  const safeUrlText = escapeHtml(resetUrl);
  const href = encodeURI(resetUrl);
  const preheader = "Reset your Weartual password using the secure link below.";
  const innerHtml = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">Password reset request</p>
    <p style="margin:0 0 14px;">Hello,</p>
    <p style="margin:0 0 14px;">We received a request to reset the password for your Weartual account. Click the button below to choose a new password. This link will expire for your security.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#3730a3,#4f46e5);color:#ffffff !important;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Reset my password</a>
    </p>
    <p style="margin:0 0 10px;font-size:13px;color:#64748b;">If the button does not work, copy and paste this URL into your browser:</p>
    <p style="margin:0;padding:12px 14px;background:#f1f5f9;border-radius:8px;word-break:break-all;font-size:12px;color:#475569;">${safeUrlText}</p>
    <p style="margin:20px 0 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `;
  return {
    subject: "Weartual — reset your password",
    html: emailShell({
      preheader,
      innerHtml,
      footerLines: [`<strong>Weartual</strong> · Password assistance`]
    })
  };
};

export const buildFeedbackUserAckEmail = (name) => {
  const n = escapeHtml(name);
  const preheader = "We received your message and will review it shortly.";
  const innerHtml = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">Thank you for contacting us</p>
    <p style="margin:0 0 14px;">Dear ${n},</p>
    <p style="margin:0 0 14px;">We have received your message submitted through the Weartual contact form. Our team reviews incoming feedback regularly and will follow up if a response is required.</p>
    <p style="margin:0;">We appreciate you taking the time to help us improve Weartual.</p>
  `;
  return {
    subject: "Weartual — we received your message",
    html: emailShell({
      preheader,
      innerHtml,
      footerLines: [`<strong>Weartual</strong> · Feedback acknowledgment`]
    })
  };
};

export const buildFeedbackInternalEmail = (name, email, messageHtml) => {
  const subjectName = String(name).replace(/[\r\n\u0000]/g, " ").trim().slice(0, 80);
  return {
    subject: `Weartual — new feedback from ${subjectName || "user"}`,
    html: emailShell({
      preheader: "New feedback submission on Weartual.",
      innerHtml: `
      <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">New feedback submission</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#334155;">
        <tr><td style="padding:6px 0;"><strong>Name:</strong></td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Email:</strong></td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#4f46e5;">${escapeHtml(email)}</a></td></tr>
      </table>
      <p style="margin:18px 0 8px;font-weight:600;color:#0f172a;">Message</p>
      <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;line-height:1.6;color:#475569;">${messageHtml}</div>
    `,
      footerLines: [`<strong>Weartual</strong> · Internal notification`]
    })
  };
};
