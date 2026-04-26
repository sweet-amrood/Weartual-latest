import asyncHandler from "../utils/asyncHandler.js";
import { createFeedbackService } from "../services/feedback.service.js";

export const submitFeedback = asyncHandler(async (req, res) => {
  const savedFeedback = await createFeedbackService({
    name: req.body.name,
    email: req.body.email,
    feedback: req.body.feedback
  });

  res.status(201).json({
    success: true,
    message: "Feedback submitted successfully",
    feedback: savedFeedback
  });
});
