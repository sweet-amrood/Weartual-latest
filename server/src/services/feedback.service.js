import AppError from "../utils/AppError.js";
import Feedback from "../models/Feedback.js";

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

  return sanitizeFeedback(doc);
};
