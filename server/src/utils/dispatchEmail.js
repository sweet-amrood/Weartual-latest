import { sendEmail } from "../config/email.js";

const EMAIL_TIMEOUT_MS = 5000;

export const dispatchEmailSafely = async ({ to, subject, html, context }) => {
  try {
    await Promise.race([
      sendEmail(to, subject, html),
      new Promise((resolve) => setTimeout(resolve, EMAIL_TIMEOUT_MS))
    ]);
  } catch (error) {
    console.error(`[email][${context}] Email dispatch failed:`, error);
  }
};
