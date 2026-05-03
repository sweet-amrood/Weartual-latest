import AppError from "../utils/AppError.js";
import Feedback from "../models/Feedback.js";
import { dispatchEmailSafely } from "../utils/dispatchEmail.js";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const companyInboxAddress = () =>
  process.env.COMPANY_EMAIL?.trim() ||
  process.env.FROM_EMAIL?.trim() ||
  process.env.SMTP_USER?.trim() ||
  "";

const sanitizeFeedback = (doc) => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  message: doc.feedback,
  createdAt: doc.createdAt
});

export const createFeedbackService = async ({ name, email, message }) => {
  if (!name?.trim()) throw new AppError("Name is required", 400);
  if (!email?.trim()) throw new AppError("Email is required", 400);
  if (!message?.trim()) throw new AppError("Message is required", 400);

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMessage = message.trim();

  let doc;
  try {
    doc = await Feedback.create({
      name: normalizedName,
      email: normalizedEmail,
      feedback: normalizedMessage
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      const firstMessage = Object.values(error.errors || {})[0]?.message;
      throw new AppError(firstMessage || "Invalid feedback payload", 400);
    }
    throw error;
  }

  const safeName = escapeHtml(normalizedName);
  const safeEmail = escapeHtml(normalizedEmail);
  const safeMessage = escapeHtml(normalizedMessage).replace(/\n/g, "<br>");

  const userAckHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>We received your feedback</h2>
      <p>Hi ${safeName},</p>
      <p>Thanks for contacting Weartual. We have received your message and will review it soon.</p>
    </div>
  `;

  const companyTo = companyInboxAddress();
  const internalHtml = companyTo
    ? `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New feedback submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      </div>
    `
    : "";

  const emailTasks = [
    dispatchEmailSafely({
      to: normalizedEmail,
      subject: "We received your feedback — Weartual",
      html: userAckHtml,
      context: "feedback-user"
    })
  ];

  if (companyTo && internalHtml) {
    emailTasks.push(
      dispatchEmailSafely({
        to: companyTo,
        subject: `[Weartual feedback] from ${normalizedName}`,
        html: internalHtml,
        context: "feedback-company"
      })
    );
  } else {
    console.warn(
      "[feedback] No company inbox (COMPANY_EMAIL, FROM_EMAIL, or SMTP_USER). Skipping internal notification email."
    );
  }

  await Promise.all(emailTasks);

  return sanitizeFeedback(doc);
};
