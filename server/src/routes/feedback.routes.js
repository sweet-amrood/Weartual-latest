import { Router } from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { feedbackValidation, validate } from "../validators/feedback.validators.js";

const router = Router();

router.post("/", feedbackValidation, validate, submitFeedback);

export default router;
