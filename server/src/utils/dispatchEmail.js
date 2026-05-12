import { sendEmail } from "../config/email.js";

/** SMTP (especially Gmail) can exceed a few seconds; too-short races silently skipped sends. */
const EMAIL_TIMEOUT_MS = 25_000;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label || "email"}: timed out after ${ms}ms`)), ms);
    }),
  ]);

export const dispatchEmailSafely = async ({ to, subject, html, context }) => {
  try {
    await withTimeout(sendEmail(to, subject, html), EMAIL_TIMEOUT_MS, context);
  } catch (error) {
    console.error(`[email][${context}] Email dispatch failed:`, error);
  }
};
