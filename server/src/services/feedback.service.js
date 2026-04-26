import AppError from "../utils/AppError.js";
import Feedback from "../models/Feedback.js";

const sanitizeFeedback = (doc) => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  feedback: doc.feedback,
  createdAt: doc.createdAt
});

export const createFeedbackService = async ({ name, email, feedback }) => {
  if (!name?.trim()) throw new AppError("Name is required", 400);
  if (!email?.trim()) throw new AppError("Email is required", 400);
  if (!feedback?.trim()) throw new AppError("Feedback is required", 400);

  const doc = await Feedback.create({
    name: name.trim(),
    email: email.trim(),
    feedback: feedback.trim()
  });

  return sanitizeFeedback(doc);
};
