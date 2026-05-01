import { body } from "express-validator";
import { validate } from "./auth.validators.js";

export const feedbackValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("message")
    .trim()
    .isLength({ min: 1, max: 3000 })
    .withMessage("Message must be 1-3000 characters")
];

export { validate };
