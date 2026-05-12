import AppError from "../utils/AppError.js";
import Feedback from "../models/Feedback.js";
import { dispatchEmailSafely } from "../utils/dispatchEmail.js";
import { buildFeedbackInternalEmail, buildFeedbackUserAckEmail } from "../utils/emailTemplates.js";

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

  const safeMessage = escapeHtml(normalizedMessage).replace(/\n/g, "<br>");

  const userAck = buildFeedbackUserAckEmail(normalizedName);

  const companyTo = companyInboxAddress();
  const internal =
    companyTo &&
    buildFeedbackInternalEmail(normalizedName, normalizedEmail, safeMessage);

  const emailTasks = [
    dispatchEmailSafely({
      to: normalizedEmail,
      subject: userAck.subject,
      html: userAck.html,
      context: "feedback-user"
    })
  ];

  if (companyTo && internal) {
    emailTasks.push(
      dispatchEmailSafely({
        to: companyTo,
        subject: internal.subject,
        html: internal.html,
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
