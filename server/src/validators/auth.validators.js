import { body, param, validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors.array().map((err) => ({
      field: err.path,
      message: err.msg
    }))
  });
};

export const signupValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required")
];

export const googleAuthValidation = [
  body("idToken").notEmpty().withMessage("Google ID token is required")
];

export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail()
];

export const resetPasswordValidation = [
  param("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
];
